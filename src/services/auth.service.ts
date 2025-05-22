import httpStatus from 'http-status';
import tokenService from './token.service';
import userService from './user.service';
import Token from '../models/token.model';
import ApiError from '../utils/ApiError';
import { tokenTypes } from '../config/tokens';
import axios from 'axios';
import { GOOGLE_USER_INFO_URL } from '../utils/urls';
import User from '../models/user.model';
import { sendSlackNotification, formatUserNotificationMessage } from '../services/slack.service';
import { generateRandomApiKey } from './api-key.service';

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email: string, password: string) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  // Send Slack notification
  const slackMessage = formatUserNotificationMessage('logged in via workergen', user);
  await sendSlackNotification(slackMessage);

  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken: string) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken: string) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    
    // Check if user ID exists in token document
    if (!refreshTokenDoc.user) {
      throw new Error('Invalid token: user ID not found');
    }
    
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error('User not found');
    }
    
    // await refreshTokenDoc.remove(); // TODO: decide to keep or not
    const tokens = await tokenService.generateAuthTokens(user);

    return {
      ...tokens,
      user,
    };
  } catch (error) {
    console.log(error);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token not found');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken: string, newPassword: string) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    
    // Check if user ID exists in token document
    if (!resetPasswordTokenDoc.user) {
      throw new Error('Invalid token: user ID not found');
    }
    
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error('User not found');
    }
    
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken: string) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    
    // Check if user ID exists in token document
    if (!verifyEmailTokenDoc.user) {
      throw new Error('Invalid token: user ID not found');
    }
    
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error('User not found');
    }
    
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

/**
 * Passwordless login or registration
 * @param {string} email
 * @param {string} token
 * @param {string} name - Optional for new users (default name will be created if not provided)
 * @returns {Promise<Object>}
 */
const passwordlessAuth = async (email: string, token: string, name?: string) => {
  try {
    // Verify the token
    const tokenDoc = await tokenService.verifyLoginToken(email, token);
    
    // Check if user exists
    let user = await userService.getUserByEmail(email);

    let created = false;
    
    // If user doesn't exist, create a new user
    if (!user) {
      let userName;
      
      // FIX: Check if name is the string "undefined" or empty or null
      if (name === "undefined" || name === null || name === "" || !name) {
        // Extract username part from email (before the @)
        const emailUsername = email.split('@')[0];
        // Convert to a more readable format (replace dots/underscores with spaces, capitalize)
        userName = emailUsername
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
      } else {
        userName = name;
      }
            // Create a new user
      user = await userService.createUser({
        name: userName,
        email,
        // Generate a random password that won't be used
        password: `${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
      });
      
      // Mark email as verified
      await userService.updateUserById(user.id, { isEmailVerified: true });
      
      created = true;
    }
    
    // Generate authentication tokens
    const tokens = await tokenService.generateAuthTokens(user);
    
    // Send notification
    const action = created ? 'registered via passwordless login' : 'logged in via passwordless login';
    const slackMessage = formatUserNotificationMessage(action, user);
    await sendSlackNotification(slackMessage);
    
    return { user, tokens, created };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication failed');
  }
};

/**
 * Social login with Google
 * @param {string} accessToken
 * @returns {Promise<Object>}
 */
const socialLoginUser = async (accessToken: string) => {
  const res = await axios.get(`${GOOGLE_USER_INFO_URL}?access_token=${accessToken}`);

  let name = res.data.given_name;
  if (res.data.family_name && res.data.family_name != 'undefined') {
    name += ' ' + res.data.family_name;
  }
  const email = res.data.email;

  // find current user in UserModel
  let userDoc = await userService.getUserByEmail(email);

  let created = false;

  // create new user if the database doesn't have this user
  if (!userDoc) {
    // First create the user with basic info
    userDoc = await userService.createUser({
      name,
      email,
      password: accessToken,
    });

    // Then generate and set the API key
    const newApiKey = generateRandomApiKey();
    userDoc = await User.findOneAndUpdate(
      { _id: userDoc.id },
      { 
        $set: { 
          isEmailVerified: true,
          apiKey: newApiKey 
        } 
      },
      { returnDocument: 'after', new: true }
    );
    created = true;
  }

  const tokens = await tokenService.generateAuthTokens(userDoc!);

  // Send Slack notification
  const action = created ? 'registered via Google for workergen' : 'logged in via Google for workergen';
  const slackMessage = formatUserNotificationMessage(action, userDoc);
  await sendSlackNotification(slackMessage);

  return { user: userDoc, tokens, created };
};

export default {
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
  socialLoginUser,
  passwordlessAuth,
};