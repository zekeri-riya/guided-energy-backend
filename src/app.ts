import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import cors from 'cors';
import passport from 'passport';
import httpStatus from 'http-status';
import config from './config/config'; // Assuming config is an ES module
import morgan from './config/morgan'; // Assuming morgan is an ES module
import { jwtStrategy } from './config/passport'; // Assuming passport is an ES module
import { 
  authLimiter, 
  generalRateLimiter, 
  paymentsLimiter, 
  businessLimiter,
  usersLimiter
} from './middlewares/rateLimiter';
import routes from './routes/v1'; // Assuming routes is an ES module
import { errorConverter, errorHandler } from './middlewares/error'; // Assuming error is an ES module
import ApiError from './utils/ApiError'; // Assuming ApiError is an ES module
import  './services/content-schedule.service';
import './services/content-generation.service';
import logger from './config/logger';
import { createClient } from 'redis';
import { initEmailSequenceCron } from './cron/email-sequence.cron';

// Use body-parser to retrieve the raw body as a buffer
import bodyParser from 'body-parser';

const xss = require('xss-clean');
const Sentry = require('@sentry/node');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

// set security HTTP headers
app.use(helmet());

// webhook
// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// sanitize request data
app.use(xss());
app.use(mongoSanitize());

// gzip compression
app.use(compression());

// enable cors
const allowedOrigins = [config.urls.frontend.base, config.urls.website];

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Remove trailing slashes for consistent comparison
    const normalizedOrigin = origin ? origin.replace(/\/$/, '') : null;
    const normalizedAllowedOrigins = allowedOrigins.map(url => url.replace(/\/$/, ''));

    if (!normalizedOrigin || normalizedAllowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// // enable cors
// const corsOptions = {
//   origin: config.urls.frontend.base,
// };
// app.use(cors(corsOptions));
// app.options('*', cors(corsOptions));

// app.use(cors({
//   origin: function(origin, callback) {
//     // Allow the origin without being strict about trailing slashes
//     if (origin && origin.startsWith('http://localhost:3000')) {
//       callback(null, origin);
//     } else {
//       callback(null, false);
//     }
//   },
//   credentials: true
// }));

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

Sentry.init({
  dsn: 'https://4fb231ddc9bf8c9489c95f840ddff142@o4507205870157824.ingest.us.sentry.io/4507205890211840',
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({ app }),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// --- Rate Limiters ---
// Apply more specific rate limiters first (order matters)
app.use('/v1/payments', paymentsLimiter);
app.use('/v1/business', businessLimiter);
app.use('/v1/users', usersLimiter);

// Auth limiter should be applied after the specific endpoint limiters
app.use('/v1/auth', authLimiter);

// General rate limiter applies to all other routes
app.use('/v1', generalRateLimiter);


// health check
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

// v1 api routes
app.use('/v1', routes);

app.use(Sentry.Handlers.errorHandler());

// send back a 404 error for any unknown api request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// convert error to ApiError, if needed
app.use(errorConverter);

// handle error
app.use(errorHandler);

export default app;
