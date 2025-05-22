// src/services/weather-scraper.service.ts - Updated for actual Weather.com login form
import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import config from '../config/config';
import logger from '../config/logger';
import { WeatherData } from '../types/weather.types';

// Constants
const TEMP_SELECTORS = [
  '[data-testid="TemperatureValue"]',
  '.CurrentConditions--tempValue--MHmYY',
  '.today-daypart-temp',
  '[data-testid="wxTempLabel"]',
  '.temp',
  '.temperature-value',
];

const CONDITION_SELECTORS = [
  '[data-testid="WeatherConditions"]',
  '.CurrentConditions--phraseValue--mZC_p',
  '.today-daypart-wxphrase',
  '[data-testid="wxPhrase"]',
  '.condition',
  '.weather-phrase',
];

const CITY_MAPPINGS: Record<string, string> = {
  london: 'UKXX0085:1:UK',
  birmingham: 'UKXX0016:1:UK',
  manchester: 'UKXX0095:1:UK',
  glasgow: 'UKXX0061:1:UK',
  leeds: 'UKXX0084:1:UK',
};

class WeatherScraperService {
  private browser: Browser | null = null;
  private sessionCookies: string | null = null;
  private isLoggedIn: boolean = false;

  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: "new", // Use new headless mode
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
      });
      logger.info('Puppeteer browser initialized with enhanced stealth');
    }
  }

  async loginToWeatherCom(): Promise<boolean> {
    if (!config.weatherCom.username || !config.weatherCom.password) {
      logger.warn('Weather.com credentials not provided, will attempt scraping without login');
      return false;
    }

    logger.info(`Attempting Weather.com login for: ${config.weatherCom.username}`);
    
    if (!this.browser) await this.init();
    const page = await this.browser!.newPage();

    try {
      // Set realistic browser environment
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      // Navigate to login page
      logger.info('Navigating to Weather.com login page...');
      await page.goto('https://weather.com/login', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for the login form to load
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
      
      // Clear any existing content in email field and type new email
      logger.info('Filling email field...');
      const emailSelector = 'input[type="email"], input[name="email"]';
      await page.click(emailSelector);
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.type(emailSelector, config.weatherCom.username!);

      // Wait a moment for form to update
      await page.waitForTimeout(1000);

      // Fill password field
      logger.info('Filling password field...');
      const passwordSelector = 'input[type="password"], input[name="password"]';
      await page.waitForSelector(passwordSelector, { timeout: 10000 });
      await page.click(passwordSelector);
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.type(passwordSelector, config.weatherCom.password!);

      // Wait for form validation
      await page.waitForTimeout(1500);

      // Click the login button
      logger.info('Clicking login button...');
      const loginButtonSelectors = [
        'button:contains("Log in")',
        'button[type="submit"]',
        '.btn-primary',
        '[data-testid="submit"]',
        'input[type="submit"]'
      ];

      let loginClicked = false;
      for (const selector of loginButtonSelectors) {
        try {
          if (selector.includes(':contains')) {
            // Handle text-based selector
            const buttons = await page.$$('button');
            for (const button of buttons) {
              const text = await page.evaluate(el => el.textContent, button);
              if (text?.toLowerCase().includes('log in')) {
                await Promise.all([
                  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
                  button.click()
                ]);
                loginClicked = true;
                break;
              }
            }
          } else {
            // Handle CSS selector
            const element = await page.$(selector);
            if (element) {
              await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
                element.click()
              ]);
              loginClicked = true;
              break;
            }
          }
          
          if (loginClicked) break;
        } catch (error) {
          logger.debug(`Login button selector failed: ${selector}`);
          continue;
        }
      }

      if (!loginClicked) {
        throw new Error('Could not find or click login button');
      }

      // Verify login success
      const currentUrl = page.url();
      logger.info(`Post-login URL: ${currentUrl}`);

      // Check for common login failure indicators
      if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        // Check for error messages
        const errorElements = await page.$$('.error, .alert-danger, [role="alert"]');
        if (errorElements.length > 0) {
          const errorText = await page.evaluate(
            el => el.textContent, 
            errorElements[0]
          );
          throw new Error(`Login failed: ${errorText}`);
        }
        throw new Error('Login failed - still on login page');
      }

      // Extract session cookies
      const cookies = await page.cookies();
      this.sessionCookies = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');

      this.isLoggedIn = true;
      logger.info(`✅ Successfully logged into Weather.com! Got ${cookies.length} session cookies`);
      return true;

    } catch (error) {
      logger.error('❌ Weather.com login failed:', error);
      this.isLoggedIn = false;
      return false;
    } finally {
      await page.close();
    }
  }

  async scrapeCity(cityName: string): Promise<WeatherData> {
    const startTime = Date.now();
    logger.info(`🌤️  Scraping ${cityName} ${this.isLoggedIn ? '(authenticated)' : '(public)'}`);
    
    try {
      if (this.isLoggedIn && this.sessionCookies) {
        const result = await this.scrapeWithSession(cityName);
        logger.info(`✅ ${cityName}: ${result.temperature}°C, ${result.weather_condition} (${Date.now() - startTime}ms)`);
        return result;
      }
      
      const result = await this.scrapeWithoutLogin(cityName);
      logger.info(`✅ ${cityName}: ${result.temperature}°C, ${result.weather_condition} (${Date.now() - startTime}ms)`);
      return result;
    } catch (error) {
      logger.error(`❌ Failed to scrape ${cityName}:`, error);
      return {
        city: cityName,
        temperature: null,
        weather_condition: 'unavailable',
      };
    }
  }

  private async scrapeWithSession(cityName: string): Promise<WeatherData> {
    if (!this.browser) await this.init();
    const page = await this.browser!.newPage();

    try {
      // Set session cookies
      const cookieObjects = this.sessionCookies!.split('; ').map(cookie => {
        const [name, value] = cookie.split('=');
        return { name, value, domain: '.weather.com' };
      });

      await page.setCookie(...cookieObjects);

      const cityCode = this.getCityCode(cityName);
      const weatherUrl = `https://weather.com/weather/today/l/${cityCode}`;
      
      await page.goto(weatherUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Extract weather data using Puppeteer's native methods
      let temperature: number | null = null;
      let condition = 'unknown';

      // Extract temperature
      for (const selector of TEMP_SELECTORS) {
        try {
          const tempElement = await page.$(selector);
          if (tempElement) {
            const tempText = await page.evaluate(el => el?.textContent, tempElement);
            if (tempText) {
              const tempNum = parseInt(tempText.replace(/[^\d-]/g, ''));
              if (!isNaN(tempNum)) {
                temperature = tempNum;
                break;
              }
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Extract condition
      for (const selector of CONDITION_SELECTORS) {
        try {
          const condElement = await page.$(selector);
          if (condElement) {
            const condText = await page.evaluate(el => el?.textContent, condElement);
            if (condText?.trim()) {
              condition = condText.trim().toLowerCase();
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }

      return {
        city: cityName,
        temperature,
        weather_condition: condition,
      };
    } finally {
      await page.close();
    }
  }

  private async scrapeWithoutLogin(cityName: string): Promise<WeatherData> {
    const cityCode = this.getCityCode(cityName);
    const url = `https://weather.com/weather/today/l/${cityCode}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const temperature = this.extractTemperature($);
    const condition = this.extractCondition($);

    return {
      city: cityName,
      temperature,
      weather_condition: condition,
    };
  }

  private extractTemperature($: cheerio.CheerioAPI): number | null {
    for (const selector of TEMP_SELECTORS) {
      const tempText = $(selector).first().text();
      if (tempText) {
        const tempNum = parseInt(tempText.replace(/[^\d-]/g, ''));
        if (!isNaN(tempNum)) {
          return tempNum;
        }
      }
    }
    return null;
  }

  private extractCondition($: cheerio.CheerioAPI): string {
    for (const selector of CONDITION_SELECTORS) {
      const condText = $(selector).first().text().trim();
      if (condText) {
        return condText.toLowerCase();
      }
    }
    return 'unknown';
  }

  private getCityCode(cityName: string): string {
    return CITY_MAPPINGS[cityName.toLowerCase()] || `${cityName.toUpperCase()}:1:UK`;
  }

  async scrapeMultipleCities(cities: string[]): Promise<WeatherData[]> {
    const results: WeatherData[] = [];
    
    for (const city of cities) {
      try {
        const weatherData = await this.scrapeCity(city);
        results.push(weatherData);
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        logger.error(`Failed to scrape ${city}:`, error);
        results.push({
          city,
          temperature: null,
          weather_condition: 'error',
        });
      }
    }

    const successRate = results.filter(r => r.temperature !== null).length;
    logger.info(`🎯 Scraping complete: ${successRate}/${cities.length} cities successful`);
    
    return results;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Puppeteer browser closed');
    }
  }
}

export default new WeatherScraperService();