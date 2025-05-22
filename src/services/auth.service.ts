// src/services/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { getDatabase } from '../config/database';
import { DatabaseUser } from '../types/database.types';
import { AuthenticatedUser } from '../types/express';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import logger from '../config/logger';

class AuthService {
  async login(email: string, password: string): Promise<{ user: AuthenticatedUser; token: string }> {
    const db = getDatabase();
    
    // Find user by email
    const user = await db.get<DatabaseUser>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    logger.info(`User ${user.email} logged in successfully`);

    return { user: authenticatedUser, token };
  }

  async register(email: string, password: string, name?: string): Promise<{ user: AuthenticatedUser; token: string }> {
    const db = getDatabase();

    // Check if user already exists
    const existingUser = await db.get<DatabaseUser>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.run(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name || null]
    );

    if (!result.lastID) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create user');
    }

    // Get created user
    const user = await db.get<DatabaseUser>(
      'SELECT * FROM users WHERE id = ?',
      [result.lastID]
    );

    if (!user) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve created user');
    }

    // Generate JWT token
    const token = this.generateToken(user.id);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    logger.info(`User ${user.email} registered successfully`);

    return { user: authenticatedUser, token };
  }

  private generateToken(userId: number): string {
    const payload = {
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (config.jwt.accessExpirationMinutes * 60),
    };

    return jwt.sign(payload, config.jwt.secret);
  }

  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as unknown as { sub: number };
      
      const db = getDatabase();
      const user = await db.get<DatabaseUser>(
        'SELECT * FROM users WHERE id = ?',
        [decoded.sub]
      );

      if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    } catch (error) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }
  }

  async getUserById(userId: number): Promise<AuthenticatedUser | null> {
    const db = getDatabase();
    
    const user = await db.get<DatabaseUser>(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}

export default new AuthService();