// src/types/express.ts
import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: User;
}