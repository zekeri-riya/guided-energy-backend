import { Response } from 'express';
import httpStatus from 'http-status';
import { AuthRequest } from '../types/express';
import llmService from '../services/llm.service';
import favoritesService from '../services/favorites.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/ApiError';

const getSummary: any = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  // Get user's favorite cities with current weather
  const weatherData = await favoritesService.getFavoriteCities(req.user.id);
  
  if (weatherData.length === 0) {
    res.status(httpStatus.OK).send({
      success: true,
      data: { summary: 'You have no favorite cities added yet. Add some cities to get weather summaries!' },
    });
    return;
  }

  // Generate summary using LLM
  const summary = await llmService.generateWeatherSummary(weatherData);
  
  res.status(httpStatus.OK).send({
    success: true,
    data: summary,
  });
});

const askQuestion: any = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
  }

  const { question } = req.body;
  
  if (!question || typeof question !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Question is required');
  }

  // Get user's favorite cities with current weather
  const weatherData = await favoritesService.getFavoriteCities(req.user.id);
  
  if (weatherData.length === 0) {
    res.status(httpStatus.OK).send({
      success: true,
      data: {
        answer: 'You have no favorite cities added yet. Add some cities to ask questions about their weather!',
        matchingCities: [],
      },
    });
    return;
  }

  // Answer question using LLM
  const answer = await llmService.answerWeatherQuestion(question, weatherData);
  
  res.status(httpStatus.OK).send({
    success: true,
    data: answer,
  });
});

export default {
  getSummary,
  askQuestion,
};