import { Response } from 'express';
import httpStatus from 'http-status';
import { AuthRequest } from '../types/express';
import favoritesService from '../services/favorites.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/ApiError';

const getFavorites: any = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const weatherData = await favoritesService.getFavoriteCities(req.user.id);
  
  res.status(httpStatus.OK).send({
    success: true,
    data: weatherData,
  });
});

const addFavorites: any = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { cities } = req.body;
  
  if (!Array.isArray(cities) || cities.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cities array is required and cannot be empty');
  }

  await favoritesService.addFavoriteCities(req.user.id, cities);
  
  res.status(httpStatus.OK).send({
    success: true,
    message: `Successfully added ${cities.length} favorite cities`,
    data: { cities },
  });
});

const getFavoriteCityNames: any = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const cityNames = await favoritesService.getFavoriteCityNames(req.user.id);
  
  res.status(httpStatus.OK).send({
    success: true,
    data: { cities: cityNames },
  });
});

export default {
  getFavorites,
  addFavorites,
  getFavoriteCityNames,
};