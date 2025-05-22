import express from 'express';
import favoritesController from '../../controllers/favorites.controller';
import authenticate from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const addFavoritesSchema = {
  body: Joi.object().keys({
    cities: Joi.array().items(Joi.string()).min(1).max(10).required(),
  }),
};

// All favorites routes require authentication
router.use(authenticate);

router.get('/', favoritesController.getFavorites);
router.post('/', validate(addFavoritesSchema), favoritesController.addFavorites);
router.get('/cities', favoritesController.getFavoriteCityNames);

export default router;