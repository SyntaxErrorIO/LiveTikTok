import { Request, Response, NextFunction } from 'express';
import { AuthManager } from '../authManager';
import { AuthedRequest } from '../types';

/**
 * User Session Extraction Middleware:
 * Inspects exclusively the HTTP Authorization header (Bearer <jwt>).
 * Query parameter (?token=) is strictly disallowed for session authentication to prevent token leakage.
 */
export const extractUser = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (token) {
    const session = AuthManager.verifyToken(token);
    if (session) {
      (req as AuthedRequest).user = session as any;
    }
  }
  next();
};

/**
 * Mandatory Authentication Middleware:
 * Requires an authenticated user session in the Authorization header.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida. Proporcione un token de sesión válido en la cabecera Authorization.',
    });
  }
  next();
};

/**
 * Mandatory Admin Authorization Middleware:
 * Requires authenticated session with 'admin' role.
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida.',
    });
  }
  if (authedReq.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado. Se requieren privilegios de administrador.',
    });
  }
  next();
};
