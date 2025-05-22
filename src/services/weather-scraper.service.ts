// src/services/weather-scraper.service.ts
import puppeteer, { Browser, Page } from 'puppeteer';
import cheerio from 'cheerio';
import axios from 'axios';
import config from '../config/config';
import logger from '../config/logger';
import { WeatherData } from '../types/weather.types';

class WeatherScraperService {
  private browser: Browser | null = null;
  private sessionCookies: string | null = null;
  private isLoggedIn: boolean = false;

  constructor() {}

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
      // Navigate to login page
      await page.goto('https://weather.com/signin', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for login form
      await page.waitForSelector('#email', { timeout: 10000 });

      // Fill login form
      await page.type('#email', config.weatherCom.username!);
      await page.type('#password', config.weatherCom.password!);

      // Submit form
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);

      // Extract session cookies
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
      // Try with session cookies first if logged in
      if (this.isLoggedIn && this.sessionCookies) {
        return await this.scrapeWithSession(cityName);
      }

      // Fallback to scraping without login
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

      // Navigate to city weather page
      const cityCode = this.getCityCode(cityName);
      const weatherUrl = `https://weather.com/weather/today/l/${cityCode}`;
      
      await page.goto(weatherUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Extract weather data
      const weatherData = await page.evaluate(() => {
        const tempSelectors = [
          '[data-testid="TemperatureValue"]',
          '.CurrentConditions--tempValue--MHmYY',
          '.today-daypart-temp',
          '[data-testid="wxTempLabel"]',
        ];

        const conditionSelectors = [
          '[data-testid="WeatherConditions"]',
          '.CurrentConditions--phraseValue--mZC_p',
          '.today-daypart-wxphrase',
          '[data-testid="wxPhrase"]',
        ];

        let temperature: number | null = null;
        let condition = 'unknown';

        // Try to find temperature
        for (const selector of tempSelectors) {
          const tempElement = document.querySelector(selector);
          if (tempElement) {
            const tempText = tempElement.textContent?.replace(/[^\d-]/g, '') || '';
            if (tempText) {
              temperature = parseInt(tempText);
              break;
            }
          }
        }

        // Try to find condition
        for (const selector of conditionSelectors) {
          const condElement = document.querySelector(selector);
          if (condElement && condElement.textContent) {
            condition = condElement.textContent.trim().toLowerCase();
            break;
          }
        }

        return { temperature, condition };
      });

      return {
        city: cityName,
        temperature: weatherData.temperature,
        weather_condition: weatherData.condition,
      };
    } finally {
      await page.close();
    }
  }

  private async scrapeWithoutLogin(cityName: string): Promise<WeatherData> {
    try {
      const cityCode = this.getCityCode(cityName);
      const url = `https://weather.com/weather/today/l/${cityCode}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 30000,
      });

      const $ = cheerio.load(response.data);

      // Extract temperature
      let temperature: number | null = null;
      const tempSelectors = [
        '[data-testid="TemperatureValue"]',
        '.CurrentConditions--tempValue--MHmYY',
        '.today-daypart-temp',
        '[data-testid="wxTempLabel"]',
      ];

      for (const selector of tempSelectors) {
        const tempText = $(selector).first().text();
        if (tempText) {
          const tempNum = parseInt(tempText.replace(/[^\d-]/g, ''));
          if (!isNaN(tempNum)) {
            temperature = tempNum;
            break;
          }
        }
      }

      // Extract weather condition
      let condition = 'unknown';
      const conditionSelectors = [
        '[data-testid="WeatherConditions"]',
        '.CurrentConditions--phraseValue--mZC_p',
        '.today-daypart-wxphrase',
        '[data-testid="wxPhrase"]',
      ];

      for (const selector of conditionSelectors) {
        const condText = $(selector).first().text().trim();
        if (condText) {
          condition = condText.toLowerCase();
          break;
        }
      }

      return {
        city: cityName,
        temperature,
        weather_condition: condition,
      };
    } catch (error) {
      logger.error(`Direct scraping failed for ${cityName}:`, error);
      throw error;
    }
  }

  private getCityCode(cityName: string): string {
    const cityMappings: Record<string, string> = {
      london: 'UKXX0085:1:UK',
      birmingham: 'UKXX0016:1:UK',
      manchester: 'UKXX0095:1:UK',
      glasgow: 'UKXX0061:1:UK',
      leeds: 'UKXX0084:1:UK',
    };

    return cityMappings[cityName.toLowerCase()] || `${cityName.toUpperCase()}:1:UK`;
  }

  async scrapeMultipleCities(cities: string[]): Promise<WeatherData[]> {
    const results: WeatherData[] = [];
    
    // Process cities sequentially to avoid overwhelming the server
    for (const city of cities) {
      try {
        const weatherData = await this.scrapeCity(city);
        results.push(weatherData);
        
        // Add delay between requests
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