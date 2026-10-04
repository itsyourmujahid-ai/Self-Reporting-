import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, FirebaseUser } from '../firebase';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrors';
import { Task, TaskTemplate, UserSettings, WeeklyReportRecord, MonthlyReportRecord } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from '../utils/defaults';
import { isDateOff } from '../utils/dateUtils';
import { synchronizeTasksWithTemplates } from './schedulingEngine';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
  lastActivityAt: string;
}

const ADMIN_EMAILS = ['admin@zaynhub.com', 'itsyourmujahid@gmail.com'];

/**
 * Initializes or updates user profile in Firestore
 */
export async function syncUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const uid = firebaseUser.uid;
  const email = (firebaseUser.email || '').toLowerCase();
  const displayName = firebaseUser.displayName || email.split('@')[0] || 'User';
  const userDocRef = doc(db, 'users', uid);

  try {
    const existingSnap = await getDoc(userDocRef);
    const now = new Date().toISOString();
    const isSpecialAdmin = ADMIN_EMAILS.includes(email);

    if (!existingSnap.exists()) {
      const profile: UserProfile = {
        id: uid,
        email,
        displayName,
        role: isSpecialAdmin ? 'admin' : 'user',
        status: 'active',
        createdAt: now,
        lastActivityAt: now,
      };

      await setDoc(userDocRef, profile);

      // If admin, also write to admins collection for zero-trust Firestore rules validation
      if (isSpecialAdmin) {
        await setDoc(doc(db, 'admins', uid), {
          email,
          createdAt: now,
        });
      }

      // Initialize clean workspace settings and templates (ZERO demo tasks, ZERO demo reports!)
      await setDoc(doc(db, 'settings', uid), {
        ...DEFAULT_SETTINGS,
        userId: uid,
        userName: displayName,
        updatedAt: now,
      });

      await setDoc(doc(db, 'templates', uid), {
        userId: uid,
        templates: DEFAULT_TEMPLATES,
        updatedAt: now,
      });

      // Automatically generate real task instances for the new user according to templates & schedule
      const initialSync = synchronizeTasksWithTemplates([], DEFAULT_TEMPLATES, DEFAULT_SETTINGS, undefined, uid);
      if (initialSync.newTasksCreated.length > 0) {
        await batchSaveTasksDocs(uid, initialSync.newTasksCreated);
      }

      await logActivity(uid, email, 'signup', `User registered: ${email}`);
      return profile;
    } else {
      const data = existingSnap.data() as UserProfile;
      // Update last activity
      await updateDoc(userDocRef, {
        lastActivityAt: now,
      });

      // Ensure admin collection record exists for known admin emails
      if (isSpecialAdmin && data.role === 'admin') {
        const adminDoc = await getDoc(doc(db, 'admins', uid));
        if (!adminDoc.exists()) {
          await setDoc(doc(db, 'admins', uid), { email, createdAt: now });
        }
      }

      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

/**
 * Loads the user's isolated workspace (Tasks, Settings, Templates, Reports)
 */
export async function loadUserWorkspace(uid: string) {
  try {
    // 1. Settings
    let settings: UserSettings = DEFAULT_SETTINGS;
    const settingsSnap = await getDoc(doc(db, 'settings', uid));
    if (settingsSnap.exists()) {
      settings = settingsSnap.data() as UserSettings;
    }

    // 2. Templates
    let templates: TaskTemplate[] = DEFAULT_TEMPLATES;
    const templatesSnap = await getDoc(doc(db, 'templates', uid));
    if (templatesSnap.exists()) {
      templates = (templatesSnap.data()?.templates as TaskTemplate[]) || DEFAULT_TEMPLATES;
    }

    // 3. Tasks - strictly isolated by userId
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', uid));
    const tasksSnap = await getDocs(tasksQuery);
    let rawTasks: Task[] = [];
    tasksSnap.forEach(d => {
      rawTasks.push(d.data() as Task);
    });

    // STRICT CENTRAL RULE: OFF DAY = ZERO TASKS!
    rawTasks = rawTasks.filter(t => !isDateOff(t.date, settings.weeklyOffDays, settings.customOffDates));

    // Automatically reconcile templates with task instances (idempotent, safe for new and existing users)
    const syncResult = synchronizeTasksWithTemplates(rawTasks, templates, settings, undefined, uid);
    const synchronizedTasks = syncResult.synchronizedTasks;

    // Persist newly generated or migrated task instances in background
    if (syncResult.newTasksCreated.length > 0) {
      batchSaveTasksDocs(uid, syncResult.newTasksCreated).catch(console.warn);
    }
    if (syncResult.tasksUpdated.length > 0) {
      batchSaveTasksDocs(uid, syncResult.tasksUpdated).catch(console.warn);
    }
    if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) {
      batchDeleteTasksDocs(uid, syncResult.oldIdsToCleanup).catch(console.warn);
    }
    if (syncResult.tasksRemoved.length > 0) {
      batchDeleteTasksDocs(uid, syncResult.tasksRemoved.map(t => t.id)).catch(console.warn);
    }

    // 4. Reports - strictly isolated by userId
    const reportsQuery = query(collection(db, 'reports'), where('userId', '==', uid));
    const reportsSnap = await getDocs(reportsQuery);
    const weeklyReports: WeeklyReportRecord[] = [];
    const monthlyReports: MonthlyReportRecord[] = [];

    reportsSnap.forEach(d => {
      const rep = d.data();
      if (rep.type === 'weekly' && rep.report) {
        weeklyReports.push(rep.report);
      } else if (rep.type === 'monthly' && rep.report) {
        monthlyReports.push(rep.report);
      }
    });

    return {
      settings,
      templates,
      tasks: synchronizedTasks,
      weeklyReports,
      monthlyReports,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }
}

/**
 * Saves a single task document isolated to the user
 */
export async function saveTaskDoc(uid: string, task: Task): Promise<void> {
  try {
    const taskRef = doc(db, 'tasks', task.id);
    await setDoc(taskRef, {
      ...task,
      userId: uid,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tasks/${task.id}`);
  }
}

/**
 * Deletes a single task document
 */
export async function deleteTaskDoc(uid: string, taskId: string): Promise<void> {
  if (!taskId || !taskId.trim()) return;
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn(`Permission warning deleting task ${taskId}:`, err);
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
  }
}

/**
 * Batch saves tasks (e.g. from month planning generation)
 */
export async function batchSaveTasksDocs(uid: string, tasksToSave: Task[], deleteRange?: { startDate: string; endDate: string }): Promise<void> {
  if (!tasksToSave || tasksToSave.length === 0) return;
  try {
    // If a deleteRange is specified, query tasks in that range to delete them
    if (deleteRange) {
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', uid),
        where('date', '>=', deleteRange.startDate),
        where('date', '<=', deleteRange.endDate)
      );
      const existingRangeSnap = await getDocs(q);
      if (!existingRangeSnap.empty) {
        const batch = writeBatch(db);
        existingRangeSnap.forEach(d => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    }

    // Save in safe chunks of 400 (Firestore max is 500 per batch)
    const CHUNK_SIZE = 400;
    for (let i = 0; i < tasksToSave.length; i += CHUNK_SIZE) {
      const chunk = tasksToSave.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const task of chunk) {
        const ref = doc(db, 'tasks', task.id);
        batch.set(ref, {
          ...task,
          userId: uid,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn('batchSaveTasksDocs error:', err);
    handleFirestoreError(err, OperationType.WRITE, 'tasks');
  }
}

/**
 * Batch deletes tasks
 */
export async function batchDeleteTasksDocs(uid: string, taskIds: string[]): Promise<void> {
  if (!taskIds || taskIds.length === 0) return;
  const validIds = taskIds.filter(id => id && typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) return;

  try {
    const CHUNK_SIZE = 400;
    for (let i = 0; i < validIds.length; i += CHUNK_SIZE) {
      const chunk = validIds.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'tasks', id));
      }
      await batch.commit();
    }
  } catch (err) {
    console.warn('Batch delete tasks warning:', err);
  }
}

/**
 * Saves user settings
 */
export async function saveSettingsDoc(uid: string, settings: UserSettings): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', uid), {
      ...settings,
      userId: uid,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `settings/${uid}`);
  }
}

/**
 * Saves user templates
 */
export async function saveTemplatesDoc(uid: string, templates: TaskTemplate[]): Promise<void> {
  try {
    await setDoc(doc(db, 'templates', uid), {
      userId: uid,
      templates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `templates/${uid}`);
  }
}

/**
 * Saves user reflection report
 */
export async function saveReportDoc(uid: string, reportId: string, type: 'weekly' | 'monthly', periodKey: string, report: any): Promise<void> {
  try {
    await setDoc(doc(db, 'reports', reportId), {
      id: reportId,
      userId: uid,
      type,
      periodKey,
      report,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reports/${reportId}`);
  }
}

/**
 * Logs platform activity signal
 */
export async function logActivity(userId: string, email: string, action: string, details?: string): Promise<void> {
  try {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await setDoc(doc(db, 'activity_logs', logId), {
      id: logId,
      userId,
      email,
      action,
      details: details || '',
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Non-blocking log
  }
}

// --- Super Admin Operations ---

export async function fetchAdminOverviewData() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnap.size;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    let activeUsers = 0;
    let newUsers = 0;

    usersSnap.forEach(d => {
      const u = d.data();
      if (u.status === 'active' && u.lastActivityAt >= sevenDaysAgo) {
        activeUsers++;
      }
      if (u.createdAt >= thirtyDaysAgo) {
        newUsers++;
      }
    });

    const tasksSnap = await getDocs(collection(db, 'tasks'));
    let totalCompletedTasks = 0;
    tasksSnap.forEach(d => {
      if (d.data()?.status === 'completed') totalCompletedTasks++;
    });

    const reportsSnap = await getDocs(collection(db, 'reports'));
    const totalReportsGenerated = reportsSnap.size;
    const totalUsage = totalCompletedTasks + totalReportsGenerated;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      totalUsage,
      totalTasksCreated: tasksSnap.size,
      totalCompletedTasks,
      totalReportsGenerated,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export async function fetchAdminUsersList() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const tasksSnap = await getDocs(collection(db, 'tasks'));
    const reportsSnap = await getDocs(collection(db, 'reports'));

    const taskCountsByUser: Record<string, { total: number; completed: number }> = {};
    tasksSnap.forEach(d => {
      const t = d.data();
      if (!t.userId) return;
      if (!taskCountsByUser[t.userId]) {
        taskCountsByUser[t.userId] = { total: 0, completed: 0 };
      }
      taskCountsByUser[t.userId].total++;
      if (t.status === 'completed') {
        taskCountsByUser[t.userId].completed++;
      }
    });

    const reportCountsByUser: Record<string, number> = {};
    reportsSnap.forEach(d => {
      const r = d.data();
      if (!r.userId) return;
      reportCountsByUser[r.userId] = (reportCountsByUser[r.userId] || 0) + 1;
    });

    const userList: any[] = [];
    usersSnap.forEach(d => {
      const u = d.data() as UserProfile;
      const tasks = taskCountsByUser[u.id] || { total: 0, completed: 0 };
      const reports = reportCountsByUser[u.id] || 0;
      userList.push({
        id: u.id,
        email: u.email,
        displayName: u.displayName || u.email.split('@')[0],
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        lastActivityAt: u.lastActivityAt,
        usageCount: tasks.completed + reports,
        totalTasks: tasks.total,
        completedTasks: tasks.completed,
        totalReports: reports,
      });
    });

    return { users: userList.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export async function updateAdminUserStatus(userId: string, status: 'active' | 'suspended') {
  try {
    await updateDoc(doc(db, 'users', userId), { status });
    return { success: true };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
  }
}

export async function fetchAdminAuditLogs() {
  try {
    const logsSnap = await getDocs(collection(db, 'activity_logs'));
    const logs: any[] = [];
    logsSnap.forEach(d => {
      logs.push(d.data());
    });
    return { logs: logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 100) };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'activity_logs');
  }
}
