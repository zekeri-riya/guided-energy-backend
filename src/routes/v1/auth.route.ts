import express from 'express';
import authController from '../../controllers/auth.controller';
import validate from '../../middlewares/validate';
import { authRateLimiter } from '../../middlewares/rateLimiter';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const loginSchema = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const registerSchema = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(1).max(50).optional(),
  }),
};

// Apply auth rate limiter to all auth routes
router.use(authRateLimiter);

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);

export default router;