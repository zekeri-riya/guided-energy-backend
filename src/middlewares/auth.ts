import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types/express';
import authService from '../services/auth.service';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';

const authenticate: any = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Access token required');
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Access token required');
    }

    const user = await authService.verifyToken(token);
    req.user = user;
    
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;