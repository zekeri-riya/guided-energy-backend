import jwt from 'jsonwebtoken';
import moment, { Moment } from 'moment';
import httpStatus from 'http-status';
import config from '../config/config';
import userService from './user.service';
import ApiError from '../utils/ApiError';
import { tokenTypes } from '../config/tokens';
import { ObjectId } from 'mongoose';
import { IUser } from '../types/IUser';
import { IToken } from '../types/IToken';
import Token from '../models/token.model';

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId: ObjectId | string, expires: Moment, type: string, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Generate a random 5-digit login token
 * @returns {string} 5-digit numeric token
 */
const generateLoginToken = (): string => {
  // Generate a random 5-digit number
  return Math.floor(10000 + Math.random() * 90000).toString();
};

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<IToken>}
 */
const saveToken = async (token: string, userId: ObjectId | string, expires: Moment, type: string, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    user: userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

/**
 * Save login token with email (used for users who don't exist yet)
 * @param {string} token
 * @param {string} email
 * @param {Moment} expires
 * @returns {Promise<IToken>}
 */
const saveLoginToken = async (token: string, email: string, expires: Moment) => {
  // Find existing email login tokens and delete them
  await Token.deleteMany({ email, type: tokenTypes.EMAIL_LOGIN });
  
  // Create new token
  const tokenDoc = await Token.create({
    token,
    email,
    expires: expires.toDate(),
    type: tokenTypes.EMAIL_LOGIN,
    blacklisted: false,
  });
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<IToken>}
 */
const verifyToken = async (token: string, type: string): Promise<IToken> => {
  try {
    const payload = jwt.verify(token, config.jwt.secret) as { sub: string };
    
    // Find the token in the database
    const tokenDoc = await Token.findOne({ 
      token, 
      type, 
      blacklisted: false 
    });
    
    if (!tokenDoc) {
      throw new Error('Token not found');
    }
    
    // Verify that the token belongs to the correct user
    if (tokenDoc.user && tokenDoc.user.toString() !== payload.sub.toString()) {
      throw new Error('Token does not match user');
    }
    
    return tokenDoc;
  } catch (error) {
    throw new Error('Token verification failed');
  }
};

/**
 * Verify login token by email and token value
 * @param {string} email
 * @param {string} token
 * @returns {Promise<IToken>}
 */
const verifyLoginToken = async (email: string, token: string): Promise<IToken> => {
  const tokenDoc = await Token.findOne({
    email,
    token,
    type: tokenTypes.EMAIL_LOGIN,
    blacklisted: false,
    expires: { $gt: new Date() }
  });
  
  if (!tokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token');
  }
  
  // Delete token after use to prevent reuse
  await tokenDoc.remove();
  
  return tokenDoc;
};

/**
 * Generate auth tokens
 * @param {IUser} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user: IUser) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Generate and save email login token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateEmailLoginToken = async (email: string) => {
  const expires = moment().add(10, 'minutes'); // Token valid for 10 minutes
  const loginToken = generateLoginToken();
  await saveLoginToken(loginToken, email, expires);
  return loginToken;
};

/**
 * Generate reset password token
 * @param {string} email
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (email: string) => {
  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No users found with this email');
  }
  const expires = moment().add(config.jwt.resetPasswordExpirationMinutes, 'minutes');
  const resetPasswordToken = generateToken(user.id, expires, tokenTypes.RESET_PASSWORD);
  await saveToken(resetPasswordToken, user.id, expires, tokenTypes.RESET_PASSWORD);
  return resetPasswordToken;
};

/**
 * Generate verify email token
 * @param {IUser} user
 * @returns {Promise<string>}
 */
const generateVerifyEmailToken = async (user: IUser) => {
  const expires = moment().add(config.jwt.verifyEmailExpirationMinutes, 'minutes');
  const verifyEmailToken = generateToken(user.id, expires, tokenTypes.VERIFY_EMAIL);
  await saveToken(verifyEmailToken, user.id, expires, tokenTypes.VERIFY_EMAIL);
  return verifyEmailToken;
};

export default {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  generateResetPasswordToken,
  generateVerifyEmailToken,
  generateEmailLoginToken,
  verifyLoginToken,
};