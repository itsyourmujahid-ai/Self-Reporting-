import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../src/middleware/auth.ts';
import { isDateOff } from '../../src/utils/dateUtils.ts';
import {
  getUserSettings,
  saveUserSettings,
  getUserTemplates,
  saveUserTemplates,
  getUserTasks,
  saveUserTask,
  batchSaveTasks,
  deleteUserTask,
  startFromTodayInDb,
  getUserReports,
  saveUserReport,
  logActivityInDb,
} from '../../src/db/repository.ts';

export const dataRouter = Router();

// All routes require user authentication
dataRouter.use(requireAuth);

dataRouter.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const [settings, templates, tasksList, reportsData] = await Promise.all([
      getUserSettings(userId),
      getUserTemplates(userId),
      getUserTasks(userId),
      getUserReports(userId),
    ]);

    res.json({
      settings,
      templates,
      tasks: tasksList,
      weeklyReports: reportsData.weeklyReports,
      monthlyReports: reportsData.monthlyReports,
    });
  } catch (error) {
    console.error('Fetch data error:', error);
    res.status(500).json({ error: 'Failed to load user workspace data.' });
  }
});

dataRouter.put('/settings', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const settings = req.body;

    const saved = await saveUserSettings(userId, settings);
    res.json({ success: true, settings: saved });
  } catch (error) {
    console.error('Save settings error:', error);
    res.status(500).json({ error: 'Failed to save settings.' });
  }
});

dataRouter.put('/templates', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const templates = req.body;

    const saved = await saveUserTemplates(userId, templates);
    res.json({ success: true, templates: saved });
  } catch (error) {
    console.error('Save templates error:', error);
    res.status(500).json({ error: 'Failed to save templates.' });
  }
});

dataRouter.post('/tasks', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const t = req.body;
    const now = new Date().toISOString();

    if (!t.id || !t.title || !t.date) {
      res.status(400).json({ error: 'Task must have an id, title, and date.' });
      return;
    }

    // Backend OFF DAY Enforcement:
    // Friday & Saturday (or custom off days) permit ZERO tasks!
    const userSettings = await getUserSettings(userId);
    const weeklyOff = userSettings?.weeklyOffDays || [5, 6];
    const customOff = userSettings?.customOffDates || [];
    if (isDateOff(t.date, weeklyOff, customOff)) {
      res.status(400).json({
        error: `OFF DAY Enforcement: ${t.date} is configured as an OFF DAY. Tasks cannot be scheduled or completed on OFF DAYS.`,
      });
      return;
    }

    // Backend Daily Task Completion Lock enforcement:
    // Only tasks scheduled for current date may transition to completed!
    const currentDate = now.slice(0, 10);
    if (t.status === 'completed' && t.date !== currentDate) {
      const userTasks = await getUserTasks(userId);
      const existing = userTasks.find((item: any) => item.id === t.id);
      if (!existing || existing.status !== 'completed') {
        res.status(400).json({
          error: `Daily Lock Enforcement: Only tasks scheduled for today (${currentDate}) can be completed. Future tasks are locked, and past tasks are historical.`,
        });
        return;
      }
    }

    const saved = await saveUserTask(userId, t);

    if (t.status === 'completed') {
      logActivityInDb(userId, 'complete_task', `Task completed: ${t.title}`);
    } else {
      logActivityInDb(userId, 'upsert_task', `Task saved: ${t.title}`);
    }

    res.json({ success: true, task: saved });
  } catch (error) {
    console.error('Save task error:', error);
    res.status(500).json({ error: 'Failed to save task.' });
  }
});

dataRouter.delete('/tasks/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await deleteUserTask(userId, id);
    logActivityInDb(userId, 'delete_task', `Task deleted: ${id}`);

    res.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

dataRouter.post('/tasks/batch', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { tasks: incomingTasks, deleteRange } = req.body;
    const now = new Date().toISOString();
    const currentDate = now.slice(0, 10);

    const safeTasks = Array.isArray(incomingTasks) ? incomingTasks : [];
    const sanitizedTasks = [];

    // Retrieve user settings to enforce OFF DAY rule
    const userSettings = await getUserSettings(userId);
    const weeklyOff = userSettings?.weeklyOffDays || [5, 6];
    const customOff = userSettings?.customOffDates || [];

    // Daily Lock & OFF DAY enforcement on batch tasks
    for (const t of safeTasks) {
      // Discard any tasks submitted on configured OFF DAYS (Friday/Saturday)
      if (isDateOff(t.date, weeklyOff, customOff)) {
        continue;
      }

      let taskStatus = t.status || 'planned';
      let taskCompletedAt = t.completedAt || null;

      if (taskStatus === 'completed' && t.date !== currentDate) {
        taskStatus = 'planned';
        taskCompletedAt = null;
      }

      sanitizedTasks.push({
        ...t,
        status: taskStatus,
        completedAt: taskCompletedAt,
      });
    }

    await batchSaveTasks(userId, sanitizedTasks, deleteRange);
    res.json({ success: true, count: sanitizedTasks.length });
  } catch (error) {
    console.error('Batch save tasks error:', error);
    res.status(500).json({ error: 'Failed to batch save tasks.' });
  }
});

dataRouter.post('/reports', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { id, type, periodKey, report } = req.body;

    if (!id || !type || !periodKey || !report) {
      res.status(400).json({ error: 'Missing required report fields.' });
      return;
    }

    await saveUserReport(userId, { id, type, periodKey, report });
    logActivityInDb(userId, 'generate_report', `Saved ${type} report for ${periodKey}`);
    res.json({ success: true, report });
  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({ error: 'Failed to save report.' });
  }
});

dataRouter.post('/start-from-today', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { startDate } = req.body;
    const targetStartDate = startDate || new Date().toISOString().slice(0, 10);

    const updatedSettings = await startFromTodayInDb(userId, targetStartDate);
    logActivityInDb(userId, 'start_from_today', `Reporting cycle started fresh from ${targetStartDate}`);

    res.json({ success: true, startDate: targetStartDate, settings: updatedSettings });
  } catch (error) {
    console.error('Start from today route error:', error);
    res.status(500).json({ error: 'Failed to start from today.' });
  }
});
