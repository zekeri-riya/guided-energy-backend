import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import { ObjectId } from 'mongoose';
import { IPaginateOptions } from '../types/IPaginate';
import User from '../models/user.model';
import { Stripe } from 'stripe';
import config from '../config/config';
import { generateRandomApiKey } from './api-key.service';
import paymentService from './payment.service';

const stripe = new Stripe(config.stripe.secretKey);

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody: { email: string; password: string; name: string }) => {
  console.log('Creating new user:', userBody);
  console.log('User body:', userBody);
  console.log('User body email:', userBody.email);
  console.log('name:', userBody.name); 
  try {
    if (await User.isEmailTaken(userBody.email)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }

    // Create user and API key in one operation
    const newApiKey = generateRandomApiKey();
    console.log("About to create user in database with API key");
    
    // Add try/catch here to specifically catch User creation errors
    let user;
    try {
      user = await User.create({
        ...userBody,
        apiKey: newApiKey
      });
      console.log('User created in database successfully:', user.id);
    } catch (userCreateError) {
      console.error('Error creating user in database:', userCreateError);
      throw userCreateError;
    }

    // Add a delay before Stripe operations to ensure DB consistency
    console.log("Waiting for database consistency before Stripe operations...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log("Creating Free Subscription on Stripe for New User");
    try {
      await paymentService.createFreeSubscription(user.id);
      console.log("Stripe subscription created successfully");
    } catch (stripeError) {
      console.error('Error creating Stripe subscription:', stripeError);
      // Consider if you want to delete the user if Stripe fails
      // await User.findByIdAndDelete(user.id);
      throw stripeError;
    }
    
    console.log('Full user creation process completed successfully');
    return user;
  } catch (error) {
    console.error('Error in createUser function:', error);
    throw error;
  }
};

// Remove the separate createUserApiKey function since we're setting the API key during creation

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter: object, options: IPaginateOptions) => {
  const users = await User.paginate(filter, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id: ObjectId | string) => {
  return User.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email: string) => {
  console.log('Getting user by email:', email);
  return User.findOne({ email });
};


/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (
  userId: ObjectId | string,
  updateBody: { 
    email?: string; 
    isEmailVerified?: boolean; 
    password?: string; 
    isUserOnboarded?: boolean;
    activeBusiness?: ObjectId | string | null;
  }
) => {
  const user = await getUserById(userId);

  console.log('Updating user:', user, updateBody);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  console.log('Updated user:', user);
  await user.save();
  console.log('Saved user:', user);
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId: ObjectId | string) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (user.subscription) {
    stripe.subscriptions.cancel(user.subscription);
  }

  await user.remove();

  return user;
};

export default {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
