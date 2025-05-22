  import { Request } from 'express';
  
  export interface AuthenticatedUser {
    id: number;
    email: string;
    name?: string;
  }
  
  export interface AuthRequest extends Request {
    user?: AuthenticatedUser;
  }