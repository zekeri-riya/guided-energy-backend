// src/services/weather-scraper.service.ts - Fixed for current Weather.com login form
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

      // Wait for page to fully load
      await page.waitForTimeout(3000);

      // Check if we see "Welcome Back!" or need to scroll/click to show login form
      const welcomeBack = await page.$('text=Welcome Back!');
      if (!welcomeBack) {
        // Try to find and click a sign-in button if the form isn't immediately visible
        const signInButtons = await page.$$('button, a, [role="button"]');
        for (const button of signInButtons) {
          const text = await page.evaluate(el => el.textContent?.toLowerCase(), button);
          if (text?.includes('sign in') || text?.includes('log in')) {
            await button.click();
            await page.waitForTimeout(2000);
            break;
          }
        }
      }

      // Updated selectors based on the current form structure
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[placeholder*="email" i]',
        'input[id*="email" i]',
        '#email',
        '.email-input'
      ];

      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[placeholder*="password" i]',
        'input[id*="password" i]',
        '#password',
        '.password-input'
      ];

      // Find and fill email field
      logger.info('Looking for email field...');
      let emailField = null;
      for (const selector of emailSelectors) {
        try {
          emailField = await page.$(selector);
          if (emailField) {
            logger.info(`Found email field with selector: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!emailField) {
        // Try a more generic approach - look for any input that might be an email field
        const inputs = await page.$$('input');
        for (const input of inputs) {
          const type = await page.evaluate(el => el.type, input);
          const placeholder = await page.evaluate(el => el.placeholder, input);
          const name = await page.evaluate(el => el.name, input);
          
          if (type === 'email' || 
              placeholder?.toLowerCase().includes('email') ||
              name?.toLowerCase().includes('email')) {
            emailField = input;
            logger.info('Found email field by attribute inspection');
            break;
          }
        }
      }

      if (!emailField) {
        throw new Error('Could not find email input field');
      }

      // Clear and fill email field
      logger.info('Filling email field...');
      await emailField.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await emailField.type(config.weatherCom.username!);

      // Wait for form to update
      await page.waitForTimeout(1500);

      // Find and fill password field
      logger.info('Looking for password field...');
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await page.$(selector);
          if (passwordField) {
            logger.info(`Found password field with selector: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!passwordField) {
        // Try a more generic approach for password field
        const inputs = await page.$$('input');
        for (const input of inputs) {
          const type = await page.evaluate(el => el.type, input);
          const placeholder = await page.evaluate(el => el.placeholder, input);
          const name = await page.evaluate(el => el.name, input);
          
          if (type === 'password' || 
              placeholder?.toLowerCase().includes('password') ||
              name?.toLowerCase().includes('password')) {
            passwordField = input;
            logger.info('Found password field by attribute inspection');
            break;
          }
        }
      }

      if (!passwordField) {
        throw new Error('Could not find password input field');
      }

      // Clear and fill password field
      logger.info('Filling password field...');
      await passwordField.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await passwordField.type(config.weatherCom.password!);

      // Wait for form validation
      await page.waitForTimeout(2000);

      // Find and click the login button
      logger.info('Looking for login button...');
      const loginButtonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
        '.btn-primary',
        '[data-testid="submit"]'
      ];

      let loginButton = null;
      
      // First try CSS selectors
      for (const selector of loginButtonSelectors) {
        try {
          if (selector.includes(':has-text')) {
            continue; // Skip Playwright-specific selectors for now
          }
          loginButton = await page.$(selector);
          if (loginButton) {
            logger.info(`Found login button with selector: ${selector}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // If no button found with CSS selectors, try text-based search
      if (!loginButton) {
        const buttons = await page.$$('button, input[type="submit"], [role="button"]');
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent?.toLowerCase() || el.value?.toLowerCase(), button);
          if (text?.includes('log in') || text?.includes('sign in') || text?.includes('submit')) {
            loginButton = button;
            logger.info('Found login button by text content');
            break;
          }
        }
      }

      if (!loginButton) {
        throw new Error('Could not find login button');
      }

      // Click the login button and wait for navigation
      logger.info('Clicking login button...');
      
      // Set up navigation promise before clicking
      const navigationPromise = page.waitForNavigation({ 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      }).catch(() => {
        // Navigation might not happen if there's an error, so we catch and continue
        logger.warn('Navigation timeout, but continuing...');
      });
      
      await loginButton.click();
      await navigationPromise;

      // Wait a bit more for any redirects
      await page.waitForTimeout(3000);

      // Verify login success
      const currentUrl = page.url();
      logger.info(`Post-login URL: ${currentUrl}`);

      // First check for obvious login success indicators
      const successIndicators = [
        'text=My Dashboard',
        'text=Sign Out',
        'text=Account',
        '[data-testid="header-account"]',
        '.user-menu',
        '.account-menu',
        'a[href*="logout"]',
        'button[aria-label*="account"]'
      ];

      let loginSuccess = false;
      for (const indicator of successIndicators) {
        try {
          const element = await page.$(indicator);
          if (element) {
            loginSuccess = true;
            logger.info(`Login success detected with: ${indicator}`);
            break;
          }
        } catch (error) {
          continue;
        }
      }

      // Also check for the redirect URL pattern that indicates success
      if (!loginSuccess && currentUrl.includes('goto=Redirected')) {
        loginSuccess = true;
        logger.info('Login success detected via redirect URL pattern');
      }

      // If no clear success indicators, check if we're redirected away from login
      if (!loginSuccess) {
        const isStillOnLoginPage = currentUrl.includes('login') || currentUrl.includes('signin');
        
        if (!isStillOnLoginPage) {
          // We've been redirected away from login page, likely successful
          loginSuccess = true;
          logger.info('Login appears successful - redirected away from login page');
        } else {
          // Still on login page, check for actual error messages
          const errorSelectors = [
            '.error',
            '.alert-danger',
            '[role="alert"]',
            '.error-message',
            '.validation-error',
            '.form-error'
          ];
          
          let actualError = false;
          for (const selector of errorSelectors) {
            const errorElement = await page.$(selector);
            if (errorElement) {
              const errorText = await page.evaluate(el => el.textContent, errorElement);
              if (errorText?.trim() && 
                  !errorText.includes('recent') && 
                  !errorText.includes('location') &&
                  errorText.length > 5) {
                actualError = true;
                throw new Error(`Login failed: ${errorText}`);
              }
            }
          }
          
          if (!actualError) {
            // No actual error found, maybe login worked but page didn't redirect properly
            loginSuccess = true;
            logger.info('No login errors detected, assuming success');
          }
        }
      }

      if (!loginSuccess) {
        throw new Error('Login failed - unable to verify success');
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