import { Request, Response } from 'express';
import httpStatus from 'http-status';
import weatherScraperService from '../services/weather-scraper.service';
import catchAsync from '../utils/catchAsync';

const getWeatherForCity: any = catchAsync(async (req: Request, res: Response) => {
  const { cityName } = req.params;
  console.log('City Name:', cityName);
  const weatherData = await weatherScraperService.scrapeCity(cityName);
  
  res.status(httpStatus.OK).send({
    success: true,
    data: weatherData,
  });
});

const getWeatherForMultipleCities: any = catchAsync(async (req: Request, res: Response) => {
  const { cities } = req.query;
  
  let cityNames: string[];
  if (typeof cities === 'string') {
    cityNames = cities.split(',').map(city => city.trim());
  } else if (Array.isArray(cities)) {
    cityNames = cities.map(city => String(city).trim());
  } else {
    // Default to UK cities if no cities specified
    cityNames = ['London', 'Birmingham', 'Manchester', 'Glasgow', 'Leeds'];
  }

  const weatherData = await weatherScraperService.scrapeMultipleCities(cityNames);
  
  res.status(httpStatus.OK).send({
    success: true,
    data: weatherData,
  });
});

export default {
  getWeatherForCity,
  getWeatherForMultipleCities,
};