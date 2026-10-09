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

// User Registration
router.post('/register', authLimiter, (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  const result = AuthManager.register({ username, email, password });
  if (!result.success) {
    return res.status(400).json(result);
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
  return res.json(result);
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
    return res.json({ valid: true, mode: 'public' });
  }
  const user = AuthManager.getUserByOverlayToken(token);
  return res.json({ valid: Boolean(user), username: user?.username || null });
});

export default router;
