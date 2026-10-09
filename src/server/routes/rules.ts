import { Router, Response } from 'express';
import { StateStore } from '../stateStore';
import { SecurityValidator } from '../securityValidator';
import { AuthedRequest } from '../types';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// Get Creator Rules
router.get('/', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  return res.json({ success: true, rules: StateStore.getRules(userId) });
});

// Create or Update Rule
router.post('/', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const validation = SecurityValidator.validateRule(req.body);
  if (!validation.valid || !validation.sanitized) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const rules = StateStore.getRules(userId);
  const existingIndex = rules.findIndex((r) => r.id === validation.sanitized!.id);

  if (existingIndex >= 0) {
    rules[existingIndex] = validation.sanitized;
  } else {
    rules.unshift(validation.sanitized);
  }

  StateStore.saveRules(rules, userId);
  return res.json({ success: true, rule: validation.sanitized });
});

// Delete Rule
router.delete('/:id', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const rules = StateStore.getRules(userId).filter((r) => r.id !== req.params.id);
  StateStore.saveRules(rules, userId);
  return res.json({ success: true });
});

// Toggle Rule Enable State
router.post('/:id/toggle', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const userId = authedReq.user!.userId;
  const rules = StateStore.getRules(userId);
  const target = rules.find((r) => r.id === req.params.id);
  if (target) {
    target.enabled = !target.enabled;
    StateStore.saveRules(rules, userId);
    return res.json({ success: true, rule: target });
  }
  return res.status(404).json({ success: false, error: 'Regla no encontrada.' });
});

export default router;
