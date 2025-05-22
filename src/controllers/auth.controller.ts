import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import { Request, Response } from 'express';
import { IUser } from '../types/IUser';
import authService from '../services/auth.service';
import emailService from '../services/email.service';
import tokenService from '../services/token.service';
import userService from '../services/user.service';
import { sendSlackNotification, formatUserNotificationMessage, formatUserEmailNotificationMessage } from '../services/slack.service';
import ApiError from '../utils/ApiError';


const requestLogin: any = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;  
  // Generate a 5-digit token
  const loginToken = await tokenService.generateEmailLoginToken(email);  
  // Send email with login token
  await emailService.sendLoginTokenEmail(email, loginToken);
  
  // Check if user exists (this is used by frontend to determine if it should collect a name)
  const userExists = await userService.getUserByEmail(email) !== null;
  
  // Send Slack notification
  const actionText = 'requested login code';
  const slackMessage = formatUserEmailNotificationMessage(actionText, { email } as any);
  await sendSlackNotification(slackMessage);
  
  res.status(httpStatus.OK).send({ 
    message: 'Login code sent to email', 
    userExists 
  });
});

const verifyLogin: any = catchAsync(async (req: Request, res: Response) => {
  const { email, token, name } = req.body;  
  // Use the auth service for passwordless authentication
  const { user, tokens, created } = await authService.passwordlessAuth(email, token, name);
  
  res.send({ user, tokens, created });
});

const register: any = catchAsync(async (req: Request, res: Response) => {

  const { agent, ...userData } = req.body;
  const user = await userService.createUser(userData);
  const tokens = await tokenService.generateAuthTokens(user);

  // send verification email
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);

  await emailService.sendVerificationEmail(user.email, verifyEmailToken);

  // Send Slack notification
  const actionText = agent ? `registered via ${agent}` : 'registered via workergen';
  const slackMessage = formatUserNotificationMessage(actionText, user);
  await sendSlackNotification(slackMessage);

  res.status(httpStatus.CREATED).send({ user, tokens, agent });
});

const login: any = catchAsync(async (req: Request, res: Response) => {
  const { email, password, agent } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  const actionText = agent ? `logged in via ${agent}` : 'logged in via workergen';
  const slackMessage = formatUserNotificationMessage(actionText, user);
  await sendSlackNotification(slackMessage);
  res.send({ user, tokens, agent });
});

const logout: any = catchAsync(async (req: Request, res: Response) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens: any = catchAsync(async (req: Request, res: Response) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword: any = catchAsync(async (req: Request, res: Response) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword: any = catchAsync(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token as string, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail: any = catchAsync(async (req: Request, res: Response) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user as IUser);
  await emailService.sendVerificationEmail((req.user as IUser)?.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail: any = catchAsync(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.query.token as string);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyGoogleUser: any = catchAsync(async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  const { user, tokens, created } = await authService.socialLoginUser(accessToken);
  
  // The 'created' boolean tells us if this is a new user (true) or existing user (false)
  const userExists = !created;
  
  return res.send({ user, tokens, created, userExists });
});

export default {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  verifyGoogleUser,
  requestLogin,
  verifyLogin,
};
