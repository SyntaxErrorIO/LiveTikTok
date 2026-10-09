import { Request } from 'express';

export interface UserSession {
  userId: string;
  username: string;
  role: 'admin' | 'creator';
  email?: string;
  avatarUrl?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface AuthedRequest extends Request {
  user?: UserSession;
}
