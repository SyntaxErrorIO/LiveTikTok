import { Router, Response } from 'express';
import { StateStore } from '../stateStore';
import { AuthedRequest } from '../types';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

// Export Full Configuration JSON
router.get('/export', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const user = authedReq.user!;
  const jsonStr = StateStore.exportFullConfigJson(user.userId);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=livetrigger_backup_${Date.now()}.json`);
  return res.send(jsonStr);
});

// Import Full Configuration JSON
router.post('/import', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const user = authedReq.user!;
  const { json } = req.body;
  if (!json || typeof json !== 'string') {
    return res.status(400).json({ success: false, error: 'Cadena JSON no proporcionada o inválida.' });
  }
  const ok = StateStore.importFullConfigJson(json, user.userId);
  return res.json({ success: ok });
});

// List Snapshots
router.get('/snapshots', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const user = authedReq.user!;
  return res.json({ success: true, snapshots: StateStore.listSnapshots(user.userId, user.role === 'admin') });
});

// Create Snapshot
router.post('/snapshots', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const user = authedReq.user!;
  const reason = req.body?.reason || 'Snapshot manual';
  const snapshot = StateStore.createSnapshot(user.userId, reason);
  return res.json({ success: true, snapshot });
});

// Restore Snapshot
router.post('/restore/:fileName', (req, res: Response) => {
  const authedReq = req as AuthedRequest;
  const user = authedReq.user!;
  const ok = StateStore.restoreSnapshot(req.params.fileName, user.userId, user.role === 'admin');
  return res.json({ success: ok });
});

export default router;
