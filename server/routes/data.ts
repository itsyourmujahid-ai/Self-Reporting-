import { Router, Response } from 'express';
import { db } from '../db';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth';

export const dataRouter = Router();

// All routes require user authentication
dataRouter.use(requireAuth);

dataRouter.get('/', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;

    // Load Settings
    const settingsRow = db.prepare('SELECT settings_json FROM user_settings WHERE user_id = ?').get(userId) as { settings_json: string } | undefined;
    let settings = null;
    if (settingsRow) {
      try {
        settings = JSON.parse(settingsRow.settings_json);
      } catch (e) {
        console.warn('Failed to parse settings JSON:', e);
      }
    }

    // Load Templates
    const templatesRow = db.prepare('SELECT templates_json FROM user_templates WHERE user_id = ?').get(userId) as { templates_json: string } | undefined;
    let templates = [];
    if (templatesRow) {
      try {
        templates = JSON.parse(templatesRow.templates_json);
      } catch (e) {
        console.warn('Failed to parse templates JSON:', e);
      }
    }

    // Load Tasks (ONLY for this user)
    const taskRows = db.prepare(`
      SELECT id, title, date, status, priority, type,
             start_time AS startTime, end_time AS endTime,
             duration_minutes AS durationMinutes, category, project, notes,
             recurrence_tag AS recurrenceTag, template_id AS templateId,
             actual_minutes AS actualMinutes, completed_at AS completedAt,
             created_at AS createdAt
      FROM tasks
      WHERE user_id = ?
      ORDER BY date ASC, start_time ASC
    `).all(userId) as any[];

    // Load Reports (ONLY for this user)
    const reportRows = db.prepare(`
      SELECT id, type, period_key, report_json, created_at, updated_at
      FROM reports
      WHERE user_id = ?
    `).all(userId) as any[];

    const weeklyReports: any[] = [];
    const monthlyReports: any[] = [];

    reportRows.forEach(r => {
      try {
        const parsed = JSON.parse(r.report_json);
        if (r.type === 'weekly') {
          weeklyReports.push(parsed);
        } else {
          monthlyReports.push(parsed);
        }
      } catch (e) {
        console.warn('Failed to parse report JSON:', e);
      }
    });

    res.json({
      settings,
      templates,
      tasks: taskRows,
      weeklyReports,
      monthlyReports,
    });
  } catch (error) {
    console.error('Fetch data error:', error);
    res.status(500).json({ error: 'Failed to load user workspace data.' });
  }
});

dataRouter.put('/settings', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const settings = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_settings (user_id, settings_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET settings_json = excluded.settings_json, updated_at = excluded.updated_at
    `).run(userId, JSON.stringify(settings), now);

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

dataRouter.put('/templates', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const templates = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO user_templates (user_id, templates_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET templates_json = excluded.templates_json, updated_at = excluded.updated_at
    `).run(userId, JSON.stringify(templates), now);

    res.json({ success: true, templates });
  } catch (error) {
    console.error('Save templates error:', error);
    res.status(500).json({ error: 'Failed to save templates.' });
  }
});

dataRouter.post('/tasks', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const t = req.body;
    const now = new Date().toISOString();

    if (!t.id || !t.title || !t.date) {
      res.status(400).json({ error: 'Task must have an id, title, and date.' });
      return;
    }

    db.prepare(`
      INSERT INTO tasks (
        id, user_id, title, date, status, priority, type,
        start_time, end_time, duration_minutes, category, project, notes,
        recurrence_tag, template_id, actual_minutes, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id, user_id) DO UPDATE SET
        title = excluded.title,
        date = excluded.date,
        status = excluded.status,
        priority = excluded.priority,
        type = excluded.type,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        duration_minutes = excluded.duration_minutes,
        category = excluded.category,
        project = excluded.project,
        notes = excluded.notes,
        recurrence_tag = excluded.recurrence_tag,
        template_id = excluded.template_id,
        actual_minutes = excluded.actual_minutes,
        completed_at = excluded.completed_at,
        updated_at = excluded.updated_at
    `).run(
      t.id,
      userId,
      t.title,
      t.date,
      t.status || 'planned',
      t.priority || 'medium',
      t.type || 'task',
      t.startTime || null,
      t.endTime || null,
      t.durationMinutes || 30,
      t.category || null,
      t.project || null,
      t.notes || null,
      t.recurrenceTag || null,
      t.templateId || null,
      t.actualMinutes || null,
      t.completedAt || null,
      t.createdAt || now,
      now
    );

    if (t.status === 'completed') {
      logActivity(userId, 'complete_task', `Task completed: ${t.title}`);
    } else {
      logActivity(userId, 'upsert_task', `Task saved: ${t.title}`);
    }

    res.json({ success: true, task: t });
  } catch (error) {
    console.error('Save task error:', error);
    res.status(500).json({ error: 'Failed to save task.' });
  }
});

dataRouter.delete('/tasks/:id', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId);
    logActivity(userId, 'delete_task', `Task deleted: ${id}`);

    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

dataRouter.post('/tasks/batch', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { tasks, deleteRange } = req.body;
    const now = new Date().toISOString();

    if (deleteRange && deleteRange.startDate && deleteRange.endDate) {
      db.prepare(`
        DELETE FROM tasks
        WHERE user_id = ? AND date >= ? AND date <= ?
      `).run(userId, deleteRange.startDate, deleteRange.endDate);
    }

    if (Array.isArray(tasks) && tasks.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO tasks (
          id, user_id, title, date, status, priority, type,
          start_time, end_time, duration_minutes, category, project, notes,
          recurrence_tag, template_id, actual_minutes, completed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id, user_id) DO UPDATE SET
          title = excluded.title,
          date = excluded.date,
          status = excluded.status,
          priority = excluded.priority,
          type = excluded.type,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          duration_minutes = excluded.duration_minutes,
          category = excluded.category,
          project = excluded.project,
          notes = excluded.notes,
          recurrence_tag = excluded.recurrence_tag,
          template_id = excluded.template_id,
          actual_minutes = excluded.actual_minutes,
          completed_at = excluded.completed_at,
          updated_at = excluded.updated_at
      `);

      for (const t of tasks) {
        insertStmt.run(
          t.id,
          userId,
          t.title,
          t.date,
          t.status || 'planned',
          t.priority || 'medium',
          t.type || 'task',
          t.startTime || null,
          t.endTime || null,
          t.durationMinutes || 30,
          t.category || null,
          t.project || null,
          t.notes || null,
          t.recurrenceTag || null,
          t.templateId || null,
          t.actualMinutes || null,
          t.completedAt || null,
          t.createdAt || now,
          now
        );
      }
      logActivity(userId, 'batch_tasks', `Generated/updated ${tasks.length} tasks`);
    }

    res.json({ success: true, count: Array.isArray(tasks) ? tasks.length : 0 });
  } catch (error) {
    console.error('Batch tasks error:', error);
    res.status(500).json({ error: 'Failed to process batch tasks.' });
  }
});

dataRouter.post('/reports', (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const { id, type, periodKey, report } = req.body;
    const now = new Date().toISOString();

    if (!id || !type || !periodKey || !report) {
      res.status(400).json({ error: 'Missing required report fields.' });
      return;
    }

    db.prepare(`
      INSERT INTO reports (id, user_id, type, period_key, report_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id, user_id) DO UPDATE SET
        report_json = excluded.report_json,
        updated_at = excluded.updated_at
    `).run(id, userId, type, periodKey, JSON.stringify(report), now, now);

    logActivity(userId, 'generate_report', `Saved ${type} report for ${periodKey}`);
    res.json({ success: true, report });
  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({ error: 'Failed to save report.' });
  }
});
