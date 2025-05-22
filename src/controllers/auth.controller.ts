import { Request, Response } from 'express';
import httpStatus from 'http-status';
import authService from '../services/auth.service';
import catchAsync from '../utils/catchAsync';

const login: any = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

const register: any = catchAsync(async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  const result = await authService.register(email, password, name);
  
  res.status(httpStatus.CREATED).send({
    success: true,
    message: 'Registration successful',
    data: result,
  });
});

export default {
  login,
  register,
};