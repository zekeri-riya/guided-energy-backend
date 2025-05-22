import { Model, ObjectId } from 'mongoose';
import { IPaginate } from './IPaginate';

export interface IUser {
  _id: ObjectId | string;
  id: ObjectId | string;
  name: string;
  email: string;
  password: string;
  role: string;
  apiKey: string | null;
  isEmailVerified: boolean;
  isUserOnboarded: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  subscription?: string | null;
  stripeCustomerId?: string;
  planType: 'free' | 'pro';
  credits: number;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  activeBusiness?: ObjectId | string | null;
}

interface IUserMethods {
  isPasswordMatch: (password: string) => boolean;
}

export interface IUserModel extends Model<IUser, {}, IUserMethods>, IPaginate {
  isEmailTaken: (email: string, excludeUserId?: ObjectId | string) => boolean;
  isPasswordMatch: (password: string) => boolean;
}
