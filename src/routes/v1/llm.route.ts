
import express from 'express';
import llmController from '../../controllers/llm.controller';
import authenticate from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const askQuestionSchema = {
  body: Joi.object().keys({
    question: Joi.string().min(1).max(500).required(),
  }),
};

// All LLM routes require authentication
router.use(authenticate);

router.get('/summary', llmController.getSummary);
router.post('/ask', validate(askQuestionSchema), llmController.askQuestion);

export default router;