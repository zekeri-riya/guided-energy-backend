import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';

interface Credentials {
  username: string;
  password: string;
}

export const validateBasicAuth = (credentials: Credentials): boolean => {
  // Replace these with your actual credentials from environment variables
  const validUsername = process.env.INTEGRATION_BASIC_AUTH_USERNAME;
  const validPassword = process.env.INTEGRATION_BASIC_AUTH_PASSWORD;
  
  return credentials.username === validUsername && credentials.password === validPassword;
};

export const getCredentialsFromHeader = (authHeader: string): Credentials | null => {
  try {
    const encoded = authHeader.split(' ')[1];
    const decoded = Buffer.from(encoded, 'base64').toString();
    const [username, password] = decoded.split(':');
    return { username, password };
  } catch (error) {
    return null;
  }
};

export const basicAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // First check for API key
    const apiKey = req.headers['x-api-key'];
    if (apiKey === process.env.INTEGRATION_API_KEY) {
      return next();
    }

    // If no API key, check for Basic Auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required');
    }

    const credentials = getCredentialsFromHeader(authHeader);
    if (!credentials || !validateBasicAuth(credentials)) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
    }

    next();
  } catch (error) {
    next(error);
  }
};