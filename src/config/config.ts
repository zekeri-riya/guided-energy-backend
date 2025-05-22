import dotenv from 'dotenv';
import path from 'path';
import Joi from 'joi';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    FRONTEND_URL: Joi.string().description('url for the frontend app'),
    WEBSITE_URL: Joi.string().description('url for the public website'),
    OPEN_AI_API_KEY: Joi.string().description('no open ai key'),

    // Stripe
    STRIPE_WEBHOOK_SECRET: Joi.string().description('stripe endpoint'),
    STRIPE_SECRET_KEY: Joi.string().description('stripe secret key'),

    // Stripe product IDs
    STRIPE_PRODUCT_FREE_PLAN: Joi.string().required().description('Stripe product ID for free plan'),
    STRIPE_PRODUCT_PRO_PLAN: Joi.string().required().description('Stripe product ID for pro plan'),
    STRIPE_PRODUCT_CREDITS: Joi.string().required().description('Stripe product ID for credits'),
    
    // Stripe price IDs
    STRIPE_PRICE_FREE_PLAN: Joi.string().required().description('Stripe price ID for free plan'),
    STRIPE_PRICE_PRO_PLAN: Joi.string().required().description('Stripe price ID for pro plan'),
    STRIPE_PRICE_100_CREDITS: Joi.string().required().description('Stripe price ID for 100 credits package'),
    STRIPE_PRICE_500_CREDITS: Joi.string().required().description('Stripe price ID for 500 credits package'),
    STRIPE_PRICE_1000_CREDITS: Joi.string().required().description('Stripe price ID for 1000 credits package'),
    REDIS_HOST: Joi.string().default('localhost').description('Redis server host'),
    REDIS_PORT: Joi.number().default(6379).description('Redis server port'),
    REDIS_PASSWORD: Joi.string().description('Redis server password'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
    options: {
      useCreateIndex: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  urls: {
    frontend: {
      base: envVars.FRONTEND_URL,
      verifyEmail: envVars.FRONTEND_URL + 'verify-email',
      resetPassword: envVars.FRONTEND_URL + 'reset-password/complete',
    },
    website: envVars.WEBSITE_URL,
  },
  openAi: envVars.OPEN_AI_API_KEY,
  stripe: {
    endpointSecret: envVars.STRIPE_WEBHOOK_SECRET,
    secretKey: envVars.STRIPE_SECRET_KEY,
    products: {
      freePlan: envVars.STRIPE_PRODUCT_FREE_PLAN,
      proPlan: envVars.STRIPE_PRODUCT_PRO_PLAN,
      credits: envVars.STRIPE_PRODUCT_CREDITS,
    },
    prices: {
      freePlan: envVars.STRIPE_PRICE_FREE_PLAN,
      proPlan: envVars.STRIPE_PRICE_PRO_PLAN,
      credits100: envVars.STRIPE_PRICE_100_CREDITS,
      credits500: envVars.STRIPE_PRICE_500_CREDITS,
      credits1000: envVars.STRIPE_PRICE_1000_CREDITS,
    },
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD
  },
};