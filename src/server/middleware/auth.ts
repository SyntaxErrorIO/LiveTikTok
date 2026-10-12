import { Request, Response, NextFunction } from 'express';
import { AuthManager } from '../authManager';
import { AuthedRequest } from '../types';

/**
 * Helper to parse cookies from raw Cookie header if cookie-parser didn't run
 */
function parseRawCookie(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    const val = parts[1]?.trim();
    if (name && val) {
      list[name] = decodeURIComponent(val);
    }
  });

  return list;
}

/**
 * User Session Extraction Middleware:
 * Inspects HTTP Authorization header (Bearer <jwt>) first,
 * or the secure HttpOnly cookie (livetrigger_session).
 * Query parameter (?token=) is strictly disallowed for session authentication to prevent token leakage.
 */
export const extractUser = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token: string | undefined;
  let authSource: 'header' | 'cookie' | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
    authSource = 'header';
  } else {
    // Inspect HttpOnly session cookie
    const cookies = (req as any).cookies || parseRawCookie(req.headers.cookie);
    if (cookies && cookies['livetrigger_session']) {
      token = cookies['livetrigger_session'].trim();
      authSource = 'cookie';
    }
  }

  if (token) {
    const session = AuthManager.verifyToken(token);
    if (session) {
      (req as AuthedRequest).user = session as any;
      (req as any).authSource = authSource;
    }
  }
  next();
};

/**
 * Mandatory CSRF Protection Middleware:
 * Protects state-changing requests (POST, PUT, DELETE, PATCH).
 * - Requests authenticated via explicit Authorization: Bearer are exempt (machine-to-machine, CLI, tests).
 * - Requests with x-webhook-secret are exempt.
 * - Browser requests relying on session cookies MUST provide a custom header (e.g. X-CSRF-Token or X-Requested-With).
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const method = req.method.toUpperCase();
  // Safe HTTP methods do not modify server state
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // Machine-to-machine, CLI, and integration requests using Authorization: Bearer are immune to browser ambient CSRF
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // Webhooks verified by secret header
  const webhookSecret = req.headers['x-webhook-secret'];
  if (webhookSecret) {
    return next();
  }

  // Check custom client-side header that cross-origin browser form submissions cannot forge without CORS preflight
  const hasCustomHeader = Boolean(
    req.headers['x-csrf-token'] ||
    req.headers['x-requested-with'] ||
    req.headers['x-livetrigger-csrf']
  );

  const isCookieSession = (req as any).authSource === 'cookie' || Boolean((req as any).cookies?.livetrigger_session);

  // If request relies on cookie session, custom header is mandatory
  if (isCookieSession && !hasCustomHeader) {
    return res.status(403).json({
      success: false,
      error: 'Protección CSRF activa: las solicitudes con sesión de cookie deben incluir la cabecera personalizada (X-CSRF-Token).',
    });
  }

  next();
};

/**
 * Mandatory Authentication Middleware:
 * Requires an authenticated user session in Authorization header or session cookie.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authedReq = req as AuthedRequest;
  if (!authedReq.user) {
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida. Inicie sesión o proporcione un token de sesión válido.',
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
