import httpStatus from 'http-status';
import pick from '../utils/pick';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { Request, Response } from 'express';
import userService from '../services/user.service';
import businessService from '../services/business.service';
import { IUser } from '../types/IUser';
import { createUserApiKey, getUserApiKey } from '../services/api-key.service';

const createUser: any = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  res.status(httpStatus.CREATED).send(user);
});

const getUsers: any = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

const getUser: any = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user);
});

const updateUser: any = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.updateUserById(req.params.userId, req.body);
  res.send(user);
});

const deleteUser: any = catchAsync(async (req: Request, res: Response) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * POST /v1/users/:userId/apiKey
 * Generate a new API key for the user
 */
const generateUserApiKey: any = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  // Here, you'd typically check if the req.user has permission (if user is self or admin)
  // to generate an API key for the user with userId.
  const newApiKey = await createUserApiKey(userId);
  res.status(httpStatus.CREATED).send({ apiKey: newApiKey });
});

/**
 * GET /v1/users/:userId/apiKey
 * Retrieve the user’s existing API key
 */
const retrieveUserApiKey: any = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  // permission check as needed...

  const apiKey = await getUserApiKey(userId);
  if (!apiKey) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No API key found for this user');
  }
  res.status(httpStatus.OK).send({ apiKey });
});

/**
 * Get the active business for a user
 */
const getActiveBusiness: any = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  
  // If no active business is set, get the first business
  if (!user.activeBusiness) {
    const businesses = await businessService.getBusinessesByUserId(userId);
    if (businesses && businesses.length > 0) {
      // Set the first business as active
      user.activeBusiness = businesses[0]._id;
      await user.save();
    }
  }
  
  // Populate the business details if there is an active business
  let businessDetails = null;
  if (user.activeBusiness) {
    businessDetails = await businessService.getBusinessById(user.activeBusiness.toString());
  }
  
  res.status(httpStatus.OK).json({ activeBusiness: businessDetails });
});

/**
 * Set the active business for a user
 */
const setActiveBusiness: any = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const { businessId } = req.body;
  
  // Verify the business exists and belongs to the user
  await businessService.verifyBusinessOwnership(businessId, userId);
  
  // Update the user's active business
  const user = await userService.updateUserById(userId, { activeBusiness: businessId });
  
  // Get the business details
  const businessDetails = await businessService.getBusinessById(businessId);
  
  res.status(httpStatus.OK).json({ 
    message: 'Active business updated successfully',
    activeBusiness: businessDetails 
  });
});

export default {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  generateUserApiKey,
  retrieveUserApiKey,
  setActiveBusiness,
  getActiveBusiness,
};
