import { Router, Response } from 'express';
import { db } from '../db';
import { requireAdmin, AuthenticatedRequest } from '../auth';

export const adminRouter = Router();

// Strict Super Admin protection on ALL admin endpoints
adminRouter.use(requireAdmin);

adminRouter.get('/overview', (req: AuthenticatedRequest, res: Response): void => {
  try {
    // 1. Total Users
    const totalUsersRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalUsers = totalUsersRow?.count || 0;

    // 2. Active Users (active in past 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsersRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE status = 'active' AND last_activity_at >= ?
    `).get(sevenDaysAgo) as { count: number };
    const activeUsers = activeUsersRow?.count || 0;

    // 3. New Users (registered in past 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const newUsersRow = db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at >= ?
    `).get(thirtyDaysAgo) as { count: number };
    const newUsers = newUsersRow?.count || 0;

    // 4. Total Usage Count (Actual meaningful interaction: completed tasks + generated reports)
    const completedTasksRow = db.prepare(`
      SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'
    `).get() as { count: number };
    const totalReportsRow = db.prepare(`
      SELECT COUNT(*) as count FROM reports
    `).get() as { count: number };
    const totalTasksRow = db.prepare(`
      SELECT COUNT(*) as count FROM tasks
    `).get() as { count: number };

    const totalUsage = (completedTasksRow?.count || 0) + (totalReportsRow?.count || 0);

    res.json({
      totalUsers,
      activeUsers,
      newUsers,
      totalUsage,
      totalTasksCreated: totalTasksRow?.count || 0,
      totalCompletedTasks: completedTasksRow?.count || 0,
      totalReportsGenerated: totalReportsRow?.count || 0,
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to compute admin statistics.' });
  }
});

adminRouter.get('/users', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const users = db.prepare(`
      SELECT
        u.id,
        u.email,
        u.display_name AS displayName,
        u.role,
        u.status,
        u.created_at AS createdAt,
        u.last_activity_at AS lastActivityAt,
        (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) AS totalTasks,
        (SELECT COUNT(*) FROM tasks WHERE user_id = u.id AND status = 'completed') AS completedTasks,
        (SELECT COUNT(*) FROM reports WHERE user_id = u.id) AS totalReports
      FROM users u
      ORDER BY u.created_at DESC
    `).all() as any[];

    // Calculate usage metric clearly
    const formatted = users.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastActivityAt: u.lastActivityAt,
      usageCount: Number(u.completedTasks) + Number(u.totalReports),
      totalTasks: Number(u.totalTasks),
      completedTasks: Number(u.completedTasks),
      totalReports: Number(u.totalReports),
    }));

    res.json({ users: formatted });
  } catch (error) {
    console.error('Admin user list error:', error);
    res.status(500).json({ error: 'Failed to retrieve user list.' });
  }
});

adminRouter.patch('/users/:id/status', (req: AuthenticatedRequest, res: Response): void => {
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

    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);

    if (status === 'suspended') {
      // Invalidate active sessions immediately
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
    }

    res.json({ success: true, id, status });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Failed to update user status.' });
  }
});

adminRouter.get('/audit-logs', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const logs = db.prepare(`
      SELECT
        l.id,
        l.action,
        l.details,
        l.timestamp,
        u.email,
        u.display_name AS displayName,
        u.role
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.timestamp DESC
      LIMIT 100
    `).all();

    res.json({ logs });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity logs.' });
  }
});

// Production Database Backup (Requirement 31)
adminRouter.get('/backup', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const users = db.prepare('SELECT id, email, display_name, role, status, created_at, last_activity_at FROM users').all();
    const settings = db.prepare('SELECT user_id, settings_json, updated_at FROM user_settings').all();
    const templates = db.prepare('SELECT user_id, templates_json, updated_at FROM user_templates').all();
    const tasks = db.prepare('SELECT * FROM tasks').all();
    const reports = db.prepare('SELECT * FROM reports').all();
    const activityLogs = db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 500').all();

    const backupPayload = {
      backupTimestamp: new Date().toISOString(),
      version: '1.0.0-production',
      totalRecords: {
        users: users.length,
        tasks: tasks.length,
        reports: reports.length,
        activityLogs: activityLogs.length,
      },
      data: {
        users,
        settings,
        templates,
        tasks,
        reports,
        activityLogs,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="self-reporting-prod-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(backupPayload);
  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({ error: 'Failed to create database backup snapshot.' });
  }
});
