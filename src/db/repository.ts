import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  userSettings,
  userTemplates,
  tasks,
  reports,
  activityLogs,
} from './schema.ts';

/**
 * Executes a database operation within a transaction where the verified
 * Firebase UID is safely set via PostgreSQL's localized `set_config`.
 * `is_local = true` ensures the configuration variable is strictly scoped to the transaction.
 */
export async function withUserContext<T>(userId: string, callback: (executor: typeof db) => Promise<T>): Promise<T> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    return await callback(tx as unknown as typeof db);
  });
}

export async function getOrCreateUser(
  id: string,
  email: string,
  displayName: string,
  role: 'user' | 'admin' = 'user'
) {
  try {
    return await withUserContext(id, async (executor) => {
      const now = new Date().toISOString();
      const safeName = displayName || email.split('@')[0] || 'User';

      const rows = await executor
        .insert(users)
        .values({
          id,
          email,
          displayName: safeName,
          role,
          status: 'active',
          createdAt: now,
          lastActivityAt: now,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email,
            displayName: safeName,
            lastActivityAt: now,
          },
        })
        .returning();

      return rows[0];
    });
  } catch (error) {
    console.error('getOrCreateUser error:', error);
    throw new Error('Failed to synchronize user with database.', { cause: error });
  }
}

export async function getUserSettings(userId: string) {
  try {
    return await withUserContext(userId, async (executor) => {
      const rows = await executor
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId))
        .limit(1);

      if (rows.length === 0) return null;
      return JSON.parse(rows[0].settingsJson);
    });
  } catch (error) {
    console.error('getUserSettings error:', error);
    throw new Error('Failed to load user settings from database.', { cause: error });
  }
}

export async function saveUserSettings(userId: string, settings: any) {
  try {
    return await withUserContext(userId, async (executor) => {
      const now = new Date().toISOString();
      const settingsJson = JSON.stringify(settings);

      await executor
        .insert(userSettings)
        .values({
          userId,
          settingsJson,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            settingsJson,
            updatedAt: now,
          },
        });

      return settings;
    });
  } catch (error) {
    console.error('saveUserSettings error:', error);
    throw new Error('Failed to save user settings in database.', { cause: error });
  }
}

export async function getUserTemplates(userId: string) {
  try {
    return await withUserContext(userId, async (executor) => {
      const rows = await executor
        .select()
        .from(userTemplates)
        .where(eq(userTemplates.userId, userId))
        .limit(1);

      if (rows.length === 0) return [];
      return JSON.parse(rows[0].templatesJson);
    });
  } catch (error) {
    console.error('getUserTemplates error:', error);
    throw new Error('Failed to load templates from database.', { cause: error });
  }
}

export async function saveUserTemplates(userId: string, templates: any[]) {
  try {
    return await withUserContext(userId, async (executor) => {
      const now = new Date().toISOString();
      const templatesJson = JSON.stringify(templates);

      await executor
        .insert(userTemplates)
        .values({
          userId,
          templatesJson,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userTemplates.userId,
          set: {
            templatesJson,
            updatedAt: now,
          },
        });

      return templates;
    });
  } catch (error) {
    console.error('saveUserTemplates error:', error);
    throw new Error('Failed to save templates in database.', { cause: error });
  }
}

export async function getUserTasks(userId: string) {
  try {
    return await withUserContext(userId, async (executor) => {
      const rows = await executor
        .select()
        .from(tasks)
        .where(eq(tasks.userId, userId));

      return rows.map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        status: t.status,
        priority: t.priority,
        type: t.type,
        startTime: t.startTime || undefined,
        endTime: t.endTime || undefined,
        durationMinutes: t.durationMinutes || 30,
        category: t.category || undefined,
        project: t.project || undefined,
        notes: t.notes || undefined,
        recurrenceTag: t.recurrenceTag || undefined,
        templateId: t.templateId || undefined,
        actualMinutes: t.actualMinutes || undefined,
        completedAt: t.completedAt || undefined,
        contactName: t.contactName || undefined,
        nextFollowUpDate: t.nextFollowUpDate || undefined,
        parentTaskId: t.parentTaskId || undefined,
        meetingWith: t.meetingWith || undefined,
        locationOrLink: t.locationOrLink || undefined,
        outcomeNotes: t.outcomeNotes || undefined,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
    });
  } catch (error) {
    console.error('getUserTasks error:', error);
    throw new Error('Failed to load user tasks from database.', { cause: error });
  }
}

export async function saveUserTask(userId: string, taskData: any) {
  try {
    return await withUserContext(userId, async (executor) => {
      const now = new Date().toISOString();
      const taskValues = {
        id: taskData.id,
        userId,
        title: taskData.title,
        date: taskData.date,
        status: taskData.status || 'planned',
        priority: taskData.priority || 'medium',
        type: taskData.type || 'task',
        startTime: taskData.startTime || null,
        endTime: taskData.endTime || null,
        durationMinutes: taskData.durationMinutes || 30,
        category: taskData.category || null,
        project: taskData.project || null,
        notes: taskData.notes || null,
        recurrenceTag: taskData.recurrenceTag || null,
        templateId: taskData.templateId || null,
        actualMinutes: taskData.actualMinutes || null,
        completedAt: taskData.completedAt || null,
        contactName: taskData.contactName || null,
        nextFollowUpDate: taskData.nextFollowUpDate || null,
        parentTaskId: taskData.parentTaskId || null,
        meetingWith: taskData.meetingWith || null,
        locationOrLink: taskData.locationOrLink || null,
        outcomeNotes: taskData.outcomeNotes || null,
        createdAt: taskData.createdAt || now,
        updatedAt: now,
      };

      await executor
        .insert(tasks)
        .values(taskValues)
        .onConflictDoUpdate({
          target: [tasks.id, tasks.userId],
          set: {
            title: taskValues.title,
            date: taskValues.date,
            status: taskValues.status,
            priority: taskValues.priority,
            type: taskValues.type,
            startTime: taskValues.startTime,
            endTime: taskValues.endTime,
            durationMinutes: taskValues.durationMinutes,
            category: taskValues.category,
            project: taskValues.project,
            notes: taskValues.notes,
            recurrenceTag: taskValues.recurrenceTag,
            templateId: taskValues.templateId,
            actualMinutes: taskValues.actualMinutes,
            completedAt: taskValues.completedAt,
            contactName: taskValues.contactName,
            nextFollowUpDate: taskValues.nextFollowUpDate,
            parentTaskId: taskValues.parentTaskId,
            meetingWith: taskValues.meetingWith,
            locationOrLink: taskValues.locationOrLink,
            outcomeNotes: taskValues.outcomeNotes,
            updatedAt: now,
          },
        });

      return taskData;
    });
  } catch (error) {
    console.error('saveUserTask error:', error);
    throw new Error('Failed to save task in database.', { cause: error });
  }
}

export async function batchSaveTasks(
  userId: string,
  tasksList: any[],
  deleteRange?: { startDate: string; endDate: string }
) {
  try {
    return await withUserContext(userId, async (executor) => {
      const now = new Date().toISOString();

      if (deleteRange?.startDate && deleteRange?.endDate) {
        await executor
          .delete(tasks)
          .where(
            and(
              eq(tasks.userId, userId),
              gte(tasks.date, deleteRange.startDate),
              lte(tasks.date, deleteRange.endDate)
            )
          );
      }

      if (tasksList && tasksList.length > 0) {
        for (const t of tasksList) {
          const taskValues = {
            id: t.id,
            userId,
            title: t.title,
            date: t.date,
            status: t.status || 'planned',
            priority: t.priority || 'medium',
            type: t.type || 'task',
            startTime: t.startTime || null,
            endTime: t.endTime || null,
            durationMinutes: t.durationMinutes || 30,
            category: t.category || null,
            project: t.project || null,
            notes: t.notes || null,
            recurrenceTag: t.recurrenceTag || null,
            templateId: t.templateId || null,
            actualMinutes: t.actualMinutes || null,
            completedAt: t.completedAt || null,
            contactName: t.contactName || null,
            nextFollowUpDate: t.nextFollowUpDate || null,
            parentTaskId: t.parentTaskId || null,
            meetingWith: t.meetingWith || null,
            locationOrLink: t.locationOrLink || null,
            outcomeNotes: t.outcomeNotes || null,
            createdAt: t.createdAt || now,
            updatedAt: now,
          };

          await executor
            .insert(tasks)
            .values(taskValues)
            .onConflictDoUpdate({
              target: [tasks.id, tasks.userId],
              set: {
                title: taskValues.title,
                date: taskValues.date,
                status: taskValues.status,
                priority: taskValues.priority,
                type: taskValues.type,
                startTime: taskValues.startTime,
                endTime: taskValues.endTime,
                durationMinutes: taskValues.durationMinutes,
                category: taskValues.category,
                project: taskValues.project,
                notes: taskValues.notes,
                recurrenceTag: taskValues.recurrenceTag,
                templateId: taskValues.templateId,
                actualMinutes: taskValues.actualMinutes,
                completedAt: taskValues.completedAt,
                contactName: taskValues.contactName,
                nextFollowUpDate: taskValues.nextFollowUpDate,
                parentTaskId: taskValues.parentTaskId,
                meetingWith: taskValues.meetingWith,
                locationOrLink: taskValues.locationOrLink,
                outcomeNotes: taskValues.outcomeNotes,
                updatedAt: now,
              },
            });
        }
      }
    });
  } catch (error) {
    console.error('batchSaveTasks error:', error);
    throw new Error('Failed to execute batch task update.', { cause: error });
  }
}

export async function deleteUserTask(userId: string, taskId: string) {
  try {
    return await withUserContext(userId, async (executor) => {
      await executor
        .delete(tasks)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    });
  } catch (error) {
    console.error('deleteUserTask error:', error);
    throw new Error('Failed to delete task from database.', { cause: error });
  }
}

export async function startFromTodayInDb(userId: string, startDate: string) {
  try {
    return await withUserContext(userId, async (executor) => {
      // Delete previous tasks strictly prior to startDate
      await executor
        .delete(tasks)
        .where(and(eq(tasks.userId, userId), sql`${tasks.date} < ${startDate}`));

      // Update settings startDate
      const current = await getUserSettings(userId);
      const updated = { ...(current || {}), startDate };
      await saveUserSettings(userId, updated);

      return updated;
    });
  } catch (error) {
    console.error('startFromTodayInDb error:', error);
    throw new Error('Failed to reset start from today in database.', { cause: error });
  }
}

export async function getUserReports(userId: string) {
  try {
    return await withUserContext(userId, async (executor) => {
      const rows = await executor
        .select()
        .from(reports)
        .where(eq(reports.userId, userId));

      const weeklyReports: any[] = [];
      const monthlyReports: any[] = [];

      rows.forEach((r) => {
        try {
          const parsed = JSON.parse(r.reportJson);
          if (r.type === 'weekly') {
            weeklyReports.push(parsed);
          } else {
            monthlyReports.push(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse report json:', e);
        }
      });

      return { weeklyReports, monthlyReports };
    });
  } catch (error) {
    console.error('getUserReports error:', error);
    throw new Error('Failed to load reports from database.', { cause: error });
  }
}

export async function saveUserReport(userId: string, reportData: any) {
  try {
    return await withUserContext(userId, async (executor) => {
      const now = new Date().toISOString();
      await executor
        .insert(reports)
        .values({
          id: reportData.id,
          userId,
          type: reportData.type,
          periodKey: reportData.periodKey,
          reportJson: JSON.stringify(reportData.report),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [reports.id, reports.userId],
          set: {
            reportJson: JSON.stringify(reportData.report),
            updatedAt: now,
          },
        });

      return reportData;
    });
  } catch (error) {
    console.error('saveUserReport error:', error);
    throw new Error('Failed to save report in database.', { cause: error });
  }
}

export async function logActivityInDb(userId: string, action: string, details?: string) {
  try {
    return await withUserContext(userId, async (executor) => {
      const cryptoMod = await import('node:crypto');
      await executor.insert(activityLogs).values({
        id: cryptoMod.randomUUID(),
        userId,
        action,
        details: details || null,
        timestamp: new Date().toISOString(),
      });
    });
  } catch (error) {
    console.warn('logActivityInDb warning:', error);
  }
}

export async function getAdminOverview() {
  try {
    const totalUsersResult = await db.select({ val: count() }).from(users);
    const totalTasksResult = await db.select({ val: count() }).from(tasks);
    const completedTasksResult = await db
      .select({ val: count() })
      .from(tasks)
      .where(eq(tasks.status, 'completed'));
    const totalReportsResult = await db.select({ val: count() }).from(reports);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsersResult = await db
      .select({ val: count() })
      .from(users)
      .where(and(eq(users.status, 'active'), gte(users.lastActivityAt, sevenDaysAgo)));

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const newUsersResult = await db
      .select({ val: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));

    const totalUsers = totalUsersResult[0]?.val || 0;
    const activeUsers = activeUsersResult[0]?.val || 0;
    const newUsers = newUsersResult[0]?.val || 0;
    const totalTasksCreated = totalTasksResult[0]?.val || 0;
    const totalCompletedTasks = completedTasksResult[0]?.val || 0;
    const totalReportsGenerated = totalReportsResult[0]?.val || 0;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      totalUsage: totalCompletedTasks + totalReportsGenerated,
      totalTasksCreated,
      totalCompletedTasks,
      totalReportsGenerated,
    };
  } catch (error) {
    console.error('getAdminOverview error:', error);
    throw new Error('Failed to retrieve admin overview metrics.', { cause: error });
  }
}

export async function getAdminUsersList() {
  try {
    const userList = await db.select().from(users).orderBy(desc(users.createdAt));
    const result = [];

    for (const u of userList) {
      const taskCount = await db
        .select({ val: count() })
        .from(tasks)
        .where(eq(tasks.userId, u.id));
      const completedCount = await db
        .select({ val: count() })
        .from(tasks)
        .where(and(eq(tasks.userId, u.id), eq(tasks.status, 'completed')));
      const reportCount = await db
        .select({ val: count() })
        .from(reports)
        .where(eq(reports.userId, u.id));

      const totalTasksNum = taskCount[0]?.val || 0;
      const completedTasksNum = completedCount[0]?.val || 0;
      const totalReportsNum = reportCount[0]?.val || 0;

      result.push({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastActivityAt: u.lastActivityAt,
        usageCount: completedTasksNum + totalReportsNum,
        totalTasks: totalTasksNum,
        completedTasks: completedTasksNum,
        totalReports: totalReportsNum,
      });
    }

    return result;
  } catch (error) {
    console.error('getAdminUsersList error:', error);
    throw new Error('Failed to retrieve users list.', { cause: error });
  }
}

export async function updateAdminUserStatusInDb(userId: string, newStatus: 'active' | 'suspended') {
  try {
    await db
      .update(users)
      .set({ status: newStatus })
      .where(eq(users.id, userId));
  } catch (error) {
    console.error('updateAdminUserStatusInDb error:', error);
    throw new Error('Failed to update user status.', { cause: error });
  }
}

export async function getAuditLogsFromDb() {
  try {
    const rows = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        details: activityLogs.details,
        timestamp: activityLogs.timestamp,
        userId: activityLogs.userId,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.timestamp))
      .limit(100);

    return rows;
  } catch (error) {
    console.error('getAuditLogsFromDb error:', error);
    throw new Error('Failed to retrieve audit logs.', { cause: error });
  }
}

export async function getFullDatabaseBackupSnapshot() {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        lastActivityAt: users.lastActivityAt,
      })
      .from(users);

    const allSettings = await db.select().from(userSettings);
    const allTemplates = await db.select().from(userTemplates);
    const allTasks = await db.select().from(tasks);
    const allReports = await db.select().from(reports);
    const allLogs = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(500);

    return {
      backupTimestamp: new Date().toISOString(),
      provider: 'Cloud SQL PostgreSQL (Developer Edition)',
      version: '1.0.0-production',
      totalRecords: {
        users: allUsers.length,
        settings: allSettings.length,
        templates: allTemplates.length,
        tasks: allTasks.length,
        reports: allReports.length,
        activityLogs: allLogs.length,
      },
      data: {
        users: allUsers,
        settings: allSettings,
        templates: allTemplates,
        tasks: allTasks,
        reports: allReports,
        activityLogs: allLogs,
      },
    };
  } catch (error) {
    console.error('getFullDatabaseBackupSnapshot error:', error);
    throw new Error('Failed to create full database backup snapshot.', { cause: error });
  }
}
