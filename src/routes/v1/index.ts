import express from 'express';
import authRoute from './auth.route';
import weatherRoute from './weather.route';
import favoritesRoute from './favorites.route';
import llmRoute from './llm.route';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/weather',
    route: weatherRoute,
  },
  {
    path: '/favorites',
    route: favoritesRoute,
  },
  {
    path: '/llm',
    route: llmRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;