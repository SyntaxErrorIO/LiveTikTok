import { Router, Request, Response } from 'express';
import { AuthManager } from '../authManager';
import { RateLimiter } from '../rateLimiter';
import { AuthedRequest } from '../types';
import { requireAuth } from '../middleware/auth';

const router = Router();

const authLimiter = RateLimiter.createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Demasiados intentos de autenticación. Por favor espera 15 minutos.',
  category: 'AUTH',
});

// Check whether public registration is open (unauthenticated)
router.get('/registration-status', (_req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  const allowRegistrationEnv = process.env.ALLOW_REGISTRATION;
  const allowRegistration =
    allowRegistrationEnv !== undefined
      ? allowRegistrationEnv.toLowerCase() === 'true' || allowRegistrationEnv === '1'
      : !isProd;

  return res.json({ registrationOpen: allowRegistration });
});

// Admin: List all user accounts
router.get('/users', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  if (authedReq.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Acceso denegado. Se requiere rol de administrador.' });
  }

  const allUsers = AuthManager.getAllUsers().map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
  }));
  return res.json({ success: true, users: allUsers });
});

// User Registration
router.post('/register', authLimiter, (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  const allowRegistrationEnv = process.env.ALLOW_REGISTRATION;
  const allowRegistration =
    allowRegistrationEnv !== undefined
      ? allowRegistrationEnv.toLowerCase() === 'true' || allowRegistrationEnv === '1'
      : !isProd;

  const authedReq = req as AuthedRequest;
  const isAdmin = authedReq.user?.role === 'admin';

  if (!allowRegistration && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'El registro público de usuarios está deshabilitado en este servidor. Pide acceso al administrador.',
    });
  }

  const { username, email, password } = req.body;
  const result = AuthManager.register({ username, email, password });
  if (!result.success) {
    return res.status(400).json(result);
  }

  if (result.token && !isAdmin) {
    res.cookie('livetrigger_session', result.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  return res.json(result);
});

// User Login
router.post('/login', authLimiter, (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const result = AuthManager.login(identifier, password);
  if (!result.success) {
    return res.status(401).json(result);
  }

  if (result.token) {
    res.cookie('livetrigger_session', result.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  return res.json(result);
});

// User Logout (Clears HttpOnly Session Cookie)
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('livetrigger_session', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  return res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});

// Get Current User Profile (Requires Authentication)
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const fullUser = AuthManager.getUserById(authedReq.user!.userId);
  return res.json({ success: true, user: fullUser });
});

// Regenerate OBS Overlay Token (Requires Authentication - No default fallback)
router.post('/overlay-token/regenerate', requireAuth, (req: Request, res: Response) => {
  const authedReq = req as AuthedRequest;
  const targetId = authedReq.user?.userId;
  if (!targetId) {
    return res.status(401).json({ success: false, error: 'Autenticación requerida para regenerar el token del overlay.' });
  }

  const newToken = AuthManager.regenerateOverlayToken(targetId);
  return res.json({ success: Boolean(newToken), overlayToken: newToken });
});

// Verify OBS Overlay Token (Public read-only check for overlay screens: strictly overlayToken via query)
router.get('/overlay/verify', (req: Request, res: Response) => {
  const token = typeof req.query.overlayToken === 'string' ? req.query.overlayToken.trim() : undefined;
  if (!token) {
    return res.status(400).json({ valid: false, error: 'Parámetro overlayToken requerido.' });
  }
  const user = AuthManager.getUserByOverlayToken(token);
  return res.json({ valid: Boolean(user), username: user?.username || null });
});

export default router;
