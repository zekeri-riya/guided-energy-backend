import express from 'express';
import weatherController from '../../controllers/weather.controller';
import validate from '../../middlewares/validate';
import { weatherRateLimiter } from '../../middlewares/rateLimiter';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const cityWeatherSchema = {
  params: Joi.object().keys({
    cityName: Joi.string().required(),
  }),
};

const multipleCitiesSchema = {
  query: Joi.object().keys({
    cities: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ).optional(),
  }),
};

// Apply weather rate limiter
router.use(weatherRateLimiter);

router.get('/city/:cityName', validate(cityWeatherSchema), weatherController.getWeatherForCity);
router.get('/cities', validate(multipleCitiesSchema), weatherController.getWeatherForMultipleCities);

export default router;