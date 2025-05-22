import { getDatabase } from '../config/database';
import { DatabaseCity, DatabaseWeatherData, DatabaseUserFavorite } from '../types/database.types';
import { WeatherData } from '../types/weather.types';
import weatherScraperService from './weather-scraper.service';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import logger from '../config/logger';

// Type for the joined query result
interface WeatherDataWithCity extends DatabaseWeatherData {
  city_name: string;
}

class FavoritesService {
  async addFavoriteCities(userId: number, cityNames: string[]): Promise<void> {
    const db = getDatabase();

    try {
      await db.run('BEGIN TRANSACTION');

      // Remove existing favorites for this user
      await db.run('DELETE FROM user_favorites WHERE user_id = ?', [userId]);

      // Add new favorites
      for (const cityName of cityNames) {
        // Find or create city
        let city = await db.get<DatabaseCity>(
          'SELECT * FROM cities WHERE LOWER(name) = LOWER(?)',
          [cityName]
        );

        if (!city) {
          // Create new city
          const result = await db.run(
            'INSERT INTO cities (name, country) VALUES (?, ?)',
            [cityName, 'UK']
          );
          
          if (!result.lastID) {
            throw new Error(`Failed to create city: ${cityName}`);
          }
          
          city = await db.get<DatabaseCity>(
            'SELECT * FROM cities WHERE id = ?',
            [result.lastID]
          );
        }

        if (!city) {
          throw new Error(`Failed to find or create city: ${cityName}`);
        }

        // Add to user favorites
        await db.run(
          'INSERT INTO user_favorites (user_id, city_id) VALUES (?, ?)',
          [userId, city.id]
        );
      }

      await db.run('COMMIT');
      logger.info(`Added ${cityNames.length} favorite cities for user ${userId}`);
    } catch (error) {
      await db.run('ROLLBACK');
      logger.error('Error adding favorite cities:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to add favorite cities');
    }
  }

  async getFavoriteCities(userId: number): Promise<WeatherData[]> {
    const db = getDatabase();

    try {
      // Get user's favorite cities
      const favoriteCities = await db.all<DatabaseCity[]>(
        `SELECT c.* FROM cities c
         INNER JOIN user_favorites uf ON c.id = uf.city_id
         WHERE uf.user_id = ?
         ORDER BY c.name`,
        [userId]
      );

      if (favoriteCities.length === 0) {
        return [];
      }

      // Get cached weather data (less than 30 minutes old)
      const weatherResults: WeatherData[] = [];
      const citiesToScrape: string[] = [];

      for (const city of favoriteCities) {
        const cachedWeather = await db.get<DatabaseWeatherData>(
          `SELECT * FROM weather_data 
           WHERE city_id = ? 
           AND datetime(scraped_at) > datetime('now', '-30 minutes')
           ORDER BY scraped_at DESC LIMIT 1`,
          [city.id]
        );

        if (cachedWeather) {
          weatherResults.push({
            city: city.name,
            temperature: cachedWeather.temperature,
            weather_condition: cachedWeather.weather_condition,
            scraped_at: cachedWeather.scraped_at,
          });
        } else {
          citiesToScrape.push(city.name);
        }
      }

      // Scrape fresh data for cities without recent cache
      if (citiesToScrape.length > 0) {
        logger.info(`Scraping fresh weather data for ${citiesToScrape.length} cities`);
        const freshWeatherData = await weatherScraperService.scrapeMultipleCities(citiesToScrape);

        // Cache the fresh data and add to results
        for (const weatherData of freshWeatherData) {
          const city = favoriteCities.find((c: { name: string; }) => c.name.toLowerCase() === weatherData.city.toLowerCase());
          if (city) {
            // Cache the weather data
            await this.cacheWeatherData(city.id, weatherData);
            weatherResults.push(weatherData);
          }
        }
      }

      return weatherResults;
    } catch (error) {
      logger.error('Error getting favorite cities:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve favorite cities');
    }
  }

  async getFavoriteCityNames(userId: number): Promise<string[]> {
    const db = getDatabase();

    try {
      const cities = await db.all<DatabaseCity[]>(
        `SELECT c.name FROM cities c
         INNER JOIN user_favorites uf ON c.id = uf.city_id
         WHERE uf.user_id = ?
         ORDER BY c.name`,
        [userId]
      );

      return cities.map((city: { name: any; }) => city.name);
    } catch (error) {
      logger.error('Error getting favorite city names:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve favorite city names');
    }
  }

  private async cacheWeatherData(cityId: number, weatherData: WeatherData): Promise<void> {
    const db = getDatabase();

    try {
      await db.run(
        'INSERT INTO weather_data (city_id, temperature, weather_condition) VALUES (?, ?, ?)',
        [cityId, weatherData.temperature, weatherData.weather_condition]
      );
    } catch (error) {
      logger.error('Error caching weather data:', error);
      // Don't throw error for caching failures
    }
  }

  async getCachedWeatherData(userId: number): Promise<WeatherData[]> {
    const db = getDatabase();

    try {
      const weatherData = await db.all<WeatherDataWithCity[]>(
        `SELECT wd.*, c.name as city_name
         FROM weather_data wd
         INNER JOIN cities c ON wd.city_id = c.id
         INNER JOIN user_favorites uf ON c.id = uf.city_id
         WHERE uf.user_id = ?
         AND datetime(wd.scraped_at) > datetime('now', '-1 hour')
         ORDER BY wd.scraped_at DESC`,
        [userId]
      );

      return weatherData.map((row) => ({
        city: row.city_name,
        temperature: row.temperature,
        weather_condition: row.weather_condition,
        scraped_at: row.scraped_at,
      }));
    } catch (error) {
      logger.error('Error getting cached weather data:', error);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve cached weather data');
    }
  }
}

export default new FavoritesService();