// src/services/weather-scraper.service.ts
import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import config from '../config/config';
import logger from '../config/logger';
import { WeatherData } from '../types/weather.types';

// Extracted constants to reduce duplication
const TEMP_SELECTORS = [
  '[data-testid="TemperatureValue"]',
  '.CurrentConditions--tempValue--MHmYY',
  '.today-daypart-temp',
  '[data-testid="wxTempLabel"]',
];

const CONDITION_SELECTORS = [
  '[data-testid="WeatherConditions"]',
  '.CurrentConditions--phraseValue--mZC_p',
  '.today-daypart-wxphrase',
  '[data-testid="wxPhrase"]',
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
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      logger.info('Puppeteer browser initialized');
    }
  }

  async loginToWeatherCom(): Promise<boolean> {
    if (!config.weatherCom.username || !config.weatherCom.password) {
      logger.warn('Weather.com credentials not provided, will attempt scraping without login');
      return false;
    }

    if (!this.browser) await this.init();
    const page = await this.browser!.newPage();

    try {
      await page.goto('https://weather.com/signin', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await page.waitForSelector('#email', { timeout: 10000 });
      await page.type('#email', config.weatherCom.username!);
      await page.type('#password', config.weatherCom.password!);

      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);

      const cookies = await page.cookies();
      this.sessionCookies = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');

      this.isLoggedIn = true;
      logger.info('Successfully logged into Weather.com');
      return true;
    } catch (error) {
      logger.error('Failed to login to Weather.com:', error);
      this.isLoggedIn = false;
      return false;
    } finally {
      await page.close();
    }
  }

  async scrapeCity(cityName: string): Promise<WeatherData> {
    try {
      if (this.isLoggedIn && this.sessionCookies) {
        return await this.scrapeWithSession(cityName);
      }
      return await this.scrapeWithoutLogin(cityName);
    } catch (error) {
      logger.error(`Failed to scrape weather for ${cityName}:`, error);
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

      // FIXED: Use Puppeteer's built-in methods instead of page.evaluate
      // This avoids the document object TypeScript error entirely
      let temperature: number | null = null;
      let condition = 'unknown';

      // Extract temperature using Puppeteer's page methods
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
          // Continue to next selector if this one fails
          continue;
        }
      }

      // Extract condition using Puppeteer's page methods
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
          // Continue to next selector if this one fails
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      timeout: 30000,
    });

    console.log('Response Status:', response.status);
    const $ = cheerio.load(response.data);

    // Reuse the same extraction logic for both methods
    const temperature = this.extractTemperature($);
    const condition = this.extractCondition($);

    return {
      city: cityName,
      temperature,
      weather_condition: condition,
    };
  }

  // Extracted common temperature extraction logic
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

  // Extracted common condition extraction logic
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
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Failed to scrape ${city}:`, error);
        results.push({
          city,
          temperature: null,
          weather_condition: 'error',
        });
      }
    }

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