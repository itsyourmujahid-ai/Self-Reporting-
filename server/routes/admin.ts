import { Router, Response } from 'express';
import { requireAdmin, AuthRequest } from '../../src/middleware/auth.ts';
import {
  getAdminOverview,
  getAdminUsersList,
  updateAdminUserStatusInDb,
  getAuditLogsFromDb,
  getFullDatabaseBackupSnapshot,
} from '../../src/db/repository.ts';

export const adminRouter = Router();

// Strict Super Admin protection on ALL admin endpoints
adminRouter.use(requireAdmin);

adminRouter.get('/overview', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await getAdminOverview();
    res.json(stats);
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to compute admin statistics.' });
  }
});

adminRouter.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await getAdminUsersList();
    res.json({ users });
  } catch (error) {
    console.error('Admin user list error:', error);
    res.status(500).json({ error: 'Failed to retrieve user list.' });
  }
});

adminRouter.patch('/users/:id/status', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'active' && status !== 'suspended') {
      res.status(400).json({ error: 'Invalid status. Must be active or suspended.' });
      return;
    }

    if (req.user?.id === id && status === 'suspended') {
      res.status(400).json({ error: 'You cannot suspend your own Super Admin account.' });
      return;
    }

    await updateAdminUserStatusInDb(id, status);
    res.json({ success: true, id, status });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

adminRouter.get('/audit-logs', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await getAuditLogsFromDb();
    res.json({ logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity logs.' });
  }
});

// Production Database Backup (Requirement 31)
adminRouter.get('/backup', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const backupPayload = await getFullDatabaseBackupSnapshot();

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="self-reporting-prod-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.json(backupPayload);
  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({ error: 'Failed to create database backup snapshot.' });
  }
});
