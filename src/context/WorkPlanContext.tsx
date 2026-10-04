import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Task,
  TaskTemplate,
  UserSettings,
  WeeklyReportRecord,
  MonthlyReportRecord,
  ActiveNavTab,
  PlannerSubTab,
  ReportsSubTab,
  TaskStatus,
  MonthlyPlanConfig,
  TaskType,
  WeeklyReflection,
  MonthlyReflection,
  AuthUser,
} from '../types';
import {
  loadStoredData,
  saveLocalSettings,
  saveLocalTemplates,
  saveLocalTasks,
  saveLocalWeeklyReports,
  saveLocalMonthlyReports,
  clearAndResetDefaults,
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearAuthSession,
  exportAllData,
  importAllData,
} from '../utils/storage';
import { auth, signOut, onAuthStateChanged } from '../firebase';
import {
  syncUserProfile,
  loadUserWorkspace,
  saveTaskDoc,
  deleteTaskDoc,
  batchSaveTasksDocs,
  batchDeleteTasksDocs,
  saveSettingsDoc,
  saveTemplatesDoc,
  saveReportDoc,
} from '../services/firestoreService';
import { synchronizeTasksWithTemplates, getRecurringTaskId } from '../services/schedulingEngine';
import {
  getTodayISO,
  formatISODate,
  parseISODate,
  getWeekRange,
  addMinutesToTime,
  getWeekIdentifier,
  isTaskOverdue,
  isDateOff,
  getNextWorkingDay,
} from '../utils/dateUtils';
import { generateDayRecurringTasks, DEFAULT_SETTINGS, DEFAULT_TEMPLATES } from '../utils/defaults';

interface DailyStats {
  total: number;
  completed: number;
  remaining: number;
  pending: number;
  inProgress: number;
  skipped: number;
  overdue: number;
  rescheduled: number;
  completionRate: number;
}

interface PeriodStats {
  total: number;
  completed: number;
  remaining: number;
  pending: number;
  skipped: number;
  overdue: number;
  rescheduled: number;
  completionRate: number;
  byType: Record<TaskType, { total: number; completed: number }>;
  byRoutine: Record<string, { total: number; completed: number; title: string }>;
}

interface MonthlyStats extends PeriodStats {
  byWeek: Array<{ weekName: string; total: number; completed: number; completionRate: number }>;
  followUpsCompleted: number;
  meetingsCompleted: number;
  contentCompleted: number;
}

interface WorkPlanContextType {
  tasks: Task[];
  templates: TaskTemplate[];
  settings: UserSettings;
  weeklyReports: WeeklyReportRecord[];
  monthlyReports: MonthlyReportRecord[];

  activeNavTab: ActiveNavTab;
  setActiveNavTab: (tab: ActiveNavTab) => void;
  plannerSubTab: PlannerSubTab;
  setPlannerSubTab: (subTab: PlannerSubTab) => void;
  reportsSubTab: ReportsSubTab;
  setReportsSubTab: (subTab: ReportsSubTab) => void;

  selectedDate: string;
  setSelectedDate: (date: string) => void;
  currentMonth: string;
  setCurrentMonth: (month: string) => void;

  // Central Off Day checks
  isDateOffDay: (dateISO: string) => boolean;
  getNextWorkingDayDate: (startDateISO?: string) => string;

  // Modals state
  isMonthlySetupOpen: boolean;
  openMonthlySetup: () => void;
  closeMonthlySetup: () => void;

  isTaskModalOpen: boolean;
  editingTask: Task | null;
  taskModalDefaultDate: string;
  taskModalDefaultType: TaskType;
  openCreateTask: (defaultDate?: string, defaultType?: TaskType) => void;
  openEditTask: (task: Task) => void;
  closeTaskModal: () => void;

  isFollowUpModalOpen: boolean;
  followUpSourceTask: Task | null;
  openFollowUpModal: (task: Task) => void;
  closeFollowUpModal: () => void;

  isMeetingModalOpen: boolean;
  meetingSourceTask: Task | null;
  openMeetingModal: (task: Task) => void;
  closeMeetingModal: () => void;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string, explicitStatus?: TaskStatus) => void;
  startTask: (id: string) => void;
  completeTask: (id: string) => void;
  skipTask: (id: string, reason?: string) => void;
  rescheduleTask: (id: string, newDate: string, newTime?: string) => void;
  updateTaskNotes: (id: string, notes: string) => void;
  saveDailyNotes: (date: string, notes: string) => void;
  completeFollowUpAndScheduleNext: (
    sourceTaskId: string,
    nextDate: string,
    nextTime: string,
    nextTitle: string,
    notes?: string
  ) => void;
  completeMeeting: (
    sourceTaskId: string,
    outcomeNotes: string,
    followUpDate?: string,
    followUpTime?: string,
    followUpTitle?: string
  ) => void;

  // Monthly planning
  generateMonthSchedule: (config: MonthlyPlanConfig) => void;

  // Templates & Settings
  updateTemplate: (template: TaskTemplate) => void;
  addTemplate: (template: Omit<TaskTemplate, 'id'>) => void;
  deleteTemplate: (id: string) => void;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  startFromToday: () => Promise<{ success: boolean; message: string }>;
  isTaskActionable: (task: Task) => boolean;

  // Reports
  saveWeeklyReflection: (weekId: string, startDate: string, endDate: string, reflection: WeeklyReflection) => void;
  saveMonthlyReflection: (monthId: string, reflection: MonthlyReflection) => void;

  // Task synchronization with active templates
  syncTasks: (targetMonths?: string[]) => void;

  // Live stats
  todayStats: DailyStats;
  getDailyStats: (dateISO: string) => DailyStats;
  thisWeekStats: PeriodStats;
  getWeeklyStats: (startISO: string, endISO: string) => PeriodStats;
  thisMonthStats: MonthlyStats;
  getMonthlyStats: (monthISO: string) => MonthlyStats;
  upcomingTasks: {
    tomorrow: Task[];
    upcomingMeetings: Task[];
    upcomingFollowUps: Task[];
    importantUpcoming: Task[];
  };

  // Authentication state
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authLoading: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;

  // Import / Export
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
  resetAll: () => void;
}

const WorkPlanContext = createContext<WorkPlanContextType | null>(null);

export const WorkPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication State
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [authLoading, setAuthLoading] = useState(true);

  const isAuthenticated = Boolean(user && token);
  const isAdmin = user?.role === 'admin';

  // Load initial persistent state from local cache with automatic template synchronization
  const [initialData] = useState(() => {
    const raw = loadStoredData();
    const sync = synchronizeTasksWithTemplates(raw.tasks, raw.templates, raw.settings);
    return {
      ...raw,
      tasks: sync.synchronizedTasks,
    };
  });

  const [settings, setSettingsState] = useState<UserSettings>(initialData.settings);
  const [templates, setTemplatesState] = useState<TaskTemplate[]>(initialData.templates);
  const [tasks, setTasksState] = useState<Task[]>(initialData.tasks);
  const [weeklyReports, setWeeklyReportsState] = useState<WeeklyReportRecord[]>(initialData.weeklyReports);
  const [monthlyReports, setMonthlyReportsState] = useState<MonthlyReportRecord[]>(initialData.monthlyReports);

  // Navigation & selection
  const todayISO = getTodayISO();
  const [activeNavTab, setActiveNavTab] = useState<ActiveNavTab>('dashboard');
  const [plannerSubTab, setPlannerSubTab] = useState<PlannerSubTab>('daily');
  const [reportsSubTab, setReportsSubTab] = useState<ReportsSubTab>('weekly');
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [currentMonth, setCurrentMonth] = useState<string>(todayISO.slice(0, 7)); // YYYY-MM

  // Modals state
  const [isMonthlySetupOpen, setIsMonthlySetupOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<string>(todayISO);
  const [taskModalDefaultType, setTaskModalDefaultType] = useState<TaskType>('one_time');

  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpSourceTask, setFollowUpSourceTask] = useState<Task | null>(null);

  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetingSourceTask, setMeetingSourceTask] = useState<Task | null>(null);

  // Auto-sync state to local fallback cache
  useEffect(() => {
    saveLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveLocalTemplates(templates);
  }, [templates]);

  useEffect(() => {
    saveLocalTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveLocalWeeklyReports(weeklyReports);
  }, [weeklyReports]);

  useEffect(() => {
    saveLocalMonthlyReports(monthlyReports);
  }, [monthlyReports]);

  // Load user workspace and listen to Firebase persistent auth session
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await syncUserProfile(firebaseUser);
          const authToken = await firebaseUser.getIdToken();
          const authUser: AuthUser = {
            id: firebaseUser.uid,
            email: (firebaseUser.email || '').toLowerCase(),
            displayName: profile?.displayName || firebaseUser.displayName || 'User',
            role: profile?.role || 'user',
          };
          if (isMounted) {
            setUser(authUser);
            setToken(authToken);
            setStoredToken(authToken);
            setStoredUser(authUser);
          }

          const workspace = await loadUserWorkspace(firebaseUser.uid);
          if (workspace && isMounted) {
            // Reconcile and backfill missing task instances from active templates
            const syncResult = synchronizeTasksWithTemplates(
              workspace.tasks,
              workspace.templates,
              workspace.settings,
              undefined,
              firebaseUser.uid
            );

            setSettingsState(workspace.settings);
            setTemplatesState(workspace.templates);
            setTasksState(syncResult.synchronizedTasks);
            setWeeklyReportsState(workspace.weeklyReports);
            setMonthlyReportsState(workspace.monthlyReports);

            // Persist newly generated instances to Firestore
            if (syncResult.newTasksCreated.length > 0) {
              batchSaveTasksDocs(firebaseUser.uid, syncResult.newTasksCreated).catch(err => {
                console.warn('Sync save new tasks error:', err);
              });
            }
            if (syncResult.tasksUpdated.length > 0) {
              batchSaveTasksDocs(firebaseUser.uid, syncResult.tasksUpdated).catch(err => {
                console.warn('Sync save updated tasks error:', err);
              });
            }
            if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) {
              batchDeleteTasksDocs(firebaseUser.uid, syncResult.oldIdsToCleanup).catch(err => {
                console.warn('Sync delete old task IDs error:', err);
              });
            }
            if (syncResult.tasksRemoved.length > 0) {
              batchDeleteTasksDocs(firebaseUser.uid, syncResult.tasksRemoved.map(t => t.id)).catch(err => {
                console.warn('Sync delete tasks error:', err);
              });
            }
          }
        } catch (e) {
          console.warn('Firebase auth initialization error:', e);
        } finally {
          if (isMounted) {
            setAuthLoading(false);
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setToken(null);
          clearAuthSession();
          setTasksState([]);
          setWeeklyReportsState([]);
          setMonthlyReportsState([]);
          setSettingsState(DEFAULT_SETTINGS);
          setTemplatesState(DEFAULT_TEMPLATES);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const syncTasks = useCallback((targetMonths?: string[]) => {
    setTasksState(prev => {
      const syncResult = synchronizeTasksWithTemplates(prev, templates, settings, targetMonths, user?.id);
      if (user?.id) {
        if (syncResult.newTasksCreated.length > 0) {
          batchSaveTasksDocs(user.id, syncResult.newTasksCreated).catch(console.warn);
        }
        if (syncResult.tasksUpdated.length > 0) {
          batchSaveTasksDocs(user.id, syncResult.tasksUpdated).catch(console.warn);
        }
        if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) {
          batchDeleteTasksDocs(user.id, syncResult.oldIdsToCleanup).catch(console.warn);
        }
        if (syncResult.tasksRemoved.length > 0) {
          batchDeleteTasksDocs(user.id, syncResult.tasksRemoved.map(t => t.id)).catch(console.warn);
        }
      }
      return syncResult.synchronizedTasks;
    });
  }, [templates, settings, user?.id]);

  // Synchronize tasks whenever currentMonth changes (e.g. forward planning or navigation)
  useEffect(() => {
    if (currentMonth) {
      syncTasks([currentMonth]);
    }
  }, [currentMonth, syncTasks]);

  const login = useCallback((authenticatedUser: AuthUser, authToken: string) => {
    setUser(authenticatedUser);
    setToken(authToken);
    setStoredToken(authToken);
    setStoredUser(authenticatedUser);
    loadUserWorkspace(authenticatedUser.id).then(workspace => {
      if (workspace) {
        const syncResult = synchronizeTasksWithTemplates(
          workspace.tasks,
          workspace.templates,
          workspace.settings,
          undefined,
          authenticatedUser.id
        );
        setSettingsState(workspace.settings);
        setTemplatesState(workspace.templates);
        setTasksState(syncResult.synchronizedTasks);
        setWeeklyReportsState(workspace.weeklyReports);
        setMonthlyReportsState(workspace.monthlyReports);

        if (syncResult.newTasksCreated.length > 0) {
          batchSaveTasksDocs(authenticatedUser.id, syncResult.newTasksCreated).catch(console.warn);
        }
        if (syncResult.tasksUpdated.length > 0) {
          batchSaveTasksDocs(authenticatedUser.id, syncResult.tasksUpdated).catch(console.warn);
        }
        if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) {
          batchDeleteTasksDocs(authenticatedUser.id, syncResult.oldIdsToCleanup).catch(console.warn);
        }
        if (syncResult.tasksRemoved.length > 0) {
          batchDeleteTasksDocs(authenticatedUser.id, syncResult.tasksRemoved.map(t => t.id)).catch(console.warn);
        }
      }
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Signout error:', e);
    }
    setUser(null);
    setToken(null);
    clearAuthSession();
    const clean = clearAndResetDefaults();
    setSettingsState(clean.settings);
    setTemplatesState(clean.templates);
    setTasksState([]);
    setWeeklyReportsState([]);
    setMonthlyReportsState([]);
    setActiveNavTab('dashboard');
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (user?.id) {
      const workspace = await loadUserWorkspace(user.id);
      if (workspace) {
        const syncResult = synchronizeTasksWithTemplates(
          workspace.tasks,
          workspace.templates,
          workspace.settings
        );
        setSettingsState(workspace.settings);
        setTemplatesState(workspace.templates);
        setTasksState(syncResult.synchronizedTasks);
        setWeeklyReportsState(workspace.weeklyReports);
        setMonthlyReportsState(workspace.monthlyReports);

        if (syncResult.newTasksCreated.length > 0) {
          batchSaveTasksDocs(user.id, syncResult.newTasksCreated).catch(console.warn);
        }
        if (syncResult.tasksUpdated.length > 0) {
          batchSaveTasksDocs(user.id, syncResult.tasksUpdated).catch(console.warn);
        }
        if (syncResult.tasksRemoved.length > 0) {
          batchDeleteTasksDocs(user.id, syncResult.tasksRemoved.map(t => t.id)).catch(console.warn);
        }
      }
    }
  }, [user?.id]);

  // Central check: Is a given date an OFF DAY?
  const isDateOffDay = useCallback(
    (dateISO: string): boolean => {
      return isDateOff(dateISO, settings.weeklyOffDays, settings.customOffDates);
    },
    [settings.weeklyOffDays, settings.customOffDates]
  );

  const getNextWorkingDayDate = useCallback(
    (startDateISO?: string): string => {
      const base = startDateISO || getTodayISO();
      return getNextWorkingDay(base, settings.weeklyOffDays, settings.customOffDates);
    },
    [settings.weeklyOffDays, settings.customOffDates]
  );

  // STRICT CENTRAL RULE: Purge any tasks that fall on configured off days
  useEffect(() => {
    setTasksState(prev => {
      const filtered = prev.filter(t => !isDateOffDay(t.date));
      if (filtered.length !== prev.length) {
        return filtered;
      }
      return prev;
    });
  }, [isDateOffDay]);

  // Modal openers
  const openMonthlySetup = useCallback(() => setIsMonthlySetupOpen(true), []);
  const closeMonthlySetup = useCallback(() => setIsMonthlySetupOpen(false), []);

  const openCreateTask = useCallback((defaultDate?: string, defaultType?: TaskType) => {
    setEditingTask(null);
    const candidateDate = defaultDate || selectedDate || getTodayISO();
    // If candidate date is off day, find next working day for default date
    let targetDate = candidateDate;
    if (isDateOffDay(candidateDate)) {
      targetDate = getNextWorkingDay(candidateDate, settings.weeklyOffDays, settings.customOffDates);
    }
    setTaskModalDefaultDate(targetDate);
    setTaskModalDefaultType(defaultType || 'one_time');
    setIsTaskModalOpen(true);
  }, [selectedDate, settings.weeklyOffDays, settings.customOffDates, isDateOffDay]);

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const closeTaskModal = useCallback(() => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
  }, []);

  const openFollowUpModal = useCallback((task: Task) => {
    setFollowUpSourceTask(task);
    setIsFollowUpModalOpen(true);
  }, []);

  const closeFollowUpModal = useCallback(() => {
    setIsFollowUpModalOpen(false);
    setFollowUpSourceTask(null);
  }, []);

  const openMeetingModal = useCallback((task: Task) => {
    setMeetingSourceTask(task);
    setIsMeetingModalOpen(true);
  }, []);

  const closeMeetingModal = useCallback(() => {
    setIsMeetingModalOpen(false);
    setMeetingSourceTask(null);
  }, []);

  // Task Actions
  const addTask = useCallback((taskData: Omit<Task, 'id' | 'createdAt'>): Task => {
    if (isDateOffDay(taskData.date)) {
      throw new Error('This is an OFF DAY. Tasks cannot be scheduled on this date.');
    }
    const today = getTodayISO();
    let initialStatus = taskData.status || 'planned';
    // STRICT DAILY TASK COMPLETION LOCK: Cannot create tasks as completed if not today
    if (initialStatus === 'completed' && taskData.date !== today) {
      initialStatus = 'planned';
    }

    const newTask: Task = {
      ...taskData,
      status: initialStatus,
      completedAt: initialStatus === 'completed' ? new Date().toISOString() : undefined,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setTasksState(prev => [...prev, newTask]);
    if (user?.id) {
      saveTaskDoc(user.id, newTask);
    }
    return newTask;
  }, [isDateOffDay, user?.id]);

  const isTaskActionable = useCallback(
    (task: Task): boolean => {
      const today = getTodayISO();
      if (isDateOffDay(task.date)) return false;
      return task.date === today;
    },
    [isDateOffDay]
  );

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const today = getTodayISO();
    if (updates.date && isDateOffDay(updates.date)) {
      throw new Error('This is an OFF DAY. Tasks cannot be scheduled on this date.');
    }
    setTasksState(prev => {
      const currentTask = prev.find(t => t.id === id);
      if (!currentTask) return prev;
      const targetDate = updates.date || currentTask.date;

      // STRICT DAILY TASK COMPLETION LOCK RULE:
      // PAST = READ ONLY, TODAY = ACTIONABLE, FUTURE = LOCKED, OFF DAY = ZERO TASKS
      if (updates.status === 'completed' && targetDate !== today) {
        if (targetDate > today) {
          throw new Error(`Daily Lock: Task is scheduled for future date (${targetDate}) and cannot be completed today.`);
        } else {
          throw new Error(`Daily Lock: Task is from past date (${targetDate}) and cannot be retroactively completed.`);
        }
      }
      if (updates.status === 'completed' && isDateOffDay(targetDate)) {
        throw new Error('OFF DAY: No tasks can be completed on configured rest days.');
      }

      let targetDoc: Task | null = null;
      const nextList = prev.map(task => {
        if (task.id === id) {
          const updated = { ...task, ...updates };
          if (updates.status === 'completed' && !task.completedAt) {
            updated.completedAt = new Date().toISOString();
          } else if (updates.status && updates.status !== 'completed') {
            updated.completedAt = undefined;
          }
          targetDoc = updated;
          return updated;
        }
        return task;
      });
      if (targetDoc && user?.id) {
        saveTaskDoc(user.id, targetDoc);
      }
      return nextList;
    });
  }, [isDateOffDay, user?.id]);

  const deleteTask = useCallback((id: string) => {
    setTasksState(prev => prev.filter(t => t.id !== id));
    if (user?.id) {
      deleteTaskDoc(user.id, id);
    }
  }, [user?.id]);

  const toggleTaskStatus = useCallback((id: string, explicitStatus?: TaskStatus) => {
    const today = getTodayISO();
    setTasksState(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      // STRICT DAILY TASK COMPLETION LOCK RULE:
      // PAST = READ ONLY, TODAY = ACTIONABLE, FUTURE = LOCKED, OFF DAY = ZERO TASKS
      if (target.date !== today) {
        if (target.date > today) {
          throw new Error(`Daily Lock: This task is scheduled for future date (${target.date}) and cannot be completed today.`);
        } else {
          throw new Error(`Daily Lock: This task is from past date (${target.date}) and cannot be retroactively completed.`);
        }
      }
      if (isDateOffDay(target.date)) {
        throw new Error('OFF DAY: No tasks can be completed on configured rest days.');
      }

      let newStatus: TaskStatus;
      if (explicitStatus) {
        newStatus = explicitStatus;
      } else {
        newStatus = target.status === 'completed' ? 'planned' : 'completed';
      }
      const updated = {
        ...target,
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
      };
      if (user?.id) {
        saveTaskDoc(user.id, updated);
      }
      return prev.map(t => (t.id === id ? updated : t));
    });
  }, [user?.id, isDateOffDay]);

  const startTask = useCallback((id: string) => {
    const today = getTodayISO();
    setTasksState(prev => {
      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      // STRICT DAILY TASK COMPLETION LOCK RULE
      if (target.date !== today) {
        if (target.date > today) {
          throw new Error(`Daily Lock: Future task cannot be started until ${target.date}.`);
        } else {
          throw new Error(`Daily Lock: Past task cannot be started.`);
        }
      }
      if (isDateOffDay(target.date)) {
        throw new Error('OFF DAY: Cannot start tasks on configured rest days.');
      }

      let targetDoc: Task | null = null;
      const nextList = prev.map(task => {
        if (task.status === 'in_progress' && task.id !== id) {
          const paused = { ...task, status: 'planned' as TaskStatus };
          if (user?.id) saveTaskDoc(user.id, paused);
          return paused;
        }
        if (task.id === id) {
          const updated = {
            ...task,
            status: 'in_progress' as TaskStatus,
            startedAt: task.startedAt || new Date().toISOString(),
          };
          targetDoc = updated;
          return updated;
        }
        return task;
      });
      if (targetDoc && user?.id) {
        saveTaskDoc(user.id, targetDoc);
      }
      return nextList;
    });
  }, [user?.id, isDateOffDay]);

  const completeTask = useCallback((id: string) => {
    updateTask(id, { status: 'completed' });
  }, [updateTask]);

  const startFromToday = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    const today = getTodayISO();
    const currentStartDate = settings.startDate;
    const hasTasksBeforeToday = tasks.some(t => t.date < today);

    // Idempotency: if already active from today and no tasks exist before today
    if (currentStartDate === today && !hasTasksBeforeToday) {
      return {
        success: true,
        message: `Your reporting cycle is already active from today (${today}).`,
      };
    }

    // 1. Identify previous tasks to purge from active history
    const tasksBeforeToday = tasks.filter(t => t.date < today);
    const validFutureAndTodayTasks = tasks.filter(t => t.date >= today);
    const oldTaskIds = tasksBeforeToday.map(t => t.id);

    // 2. Updated settings with persistent startDate
    const updatedSettings: UserSettings = {
      ...settings,
      startDate: today,
    };

    // 3. Re-synchronize remaining tasks from today onwards
    const syncResult = synchronizeTasksWithTemplates(
      validFutureAndTodayTasks,
      templates,
      updatedSettings,
      [today.slice(0, 7)],
      user?.id
    );

    // 4. Update local states
    setSettingsState(updatedSettings);
    setTasksState(syncResult.synchronizedTasks);
    // Prune previous reports before today
    setWeeklyReportsState(prev => prev.filter(r => r.endDate >= today));
    setMonthlyReportsState(prev => prev.filter(r => r.monthIdentifier >= today.slice(0, 7)));

    // 5. Persist to Firestore
    if (user?.id) {
      saveSettingsDoc(user.id, updatedSettings).catch(console.warn);
      if (oldTaskIds.length > 0) {
        batchDeleteTasksDocs(user.id, oldTaskIds).catch(console.warn);
      }
      if (syncResult.newTasksCreated.length > 0) {
        batchSaveTasksDocs(user.id, syncResult.newTasksCreated).catch(console.warn);
      }
      if (syncResult.tasksUpdated.length > 0) {
        batchSaveTasksDocs(user.id, syncResult.tasksUpdated).catch(console.warn);
      }
      if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) {
        batchDeleteTasksDocs(user.id, syncResult.oldIdsToCleanup).catch(console.warn);
      }
    }

    // 6. Notify server backend route
    try {
      await fetch('/api/data/start-from-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ startDate: today }),
      });
    } catch (e) {
      console.warn('Backend start-from-today sync warning:', e);
    }

    return {
      success: true,
      message: `Your reporting cycle has started fresh from today (${today}). Previous task history has been archived.`,
    };
  }, [tasks, settings, templates, user?.id, token]);

  const skipTask = useCallback((id: string, reason?: string) => {
    updateTask(id, { status: 'skipped', skippedReason: reason !== undefined ? reason.trim() : '' });
  }, [updateTask]);

  const rescheduleTask = useCallback((id: string, newDate: string, newTime?: string) => {
    if (isDateOffDay(newDate)) {
      throw new Error('This is an OFF DAY. Tasks cannot be scheduled on this date.');
    }
    updateTask(id, {
      date: newDate,
      startTime: newTime !== undefined && newTime !== '' ? newTime : undefined,
      status: 'rescheduled',
      rescheduledDate: newDate,
      rescheduledAt: new Date().toISOString(),
    });
  }, [isDateOffDay, updateTask]);

  const updateTaskNotes = useCallback((id: string, notes: string) => {
    updateTask(id, { notes });
  }, [updateTask]);

  const saveDailyNotes = useCallback((date: string, notes: string) => {
    setSettingsState(prev => ({
      ...prev,
      dailyNotes: {
        ...(prev.dailyNotes || {}),
        [date]: notes,
      },
    }));
  }, []);

  const completeFollowUpAndScheduleNext = useCallback(
    (sourceTaskId: string, nextDate: string, nextTime: string, nextTitle: string, notes?: string) => {
      if (isDateOffDay(nextDate)) {
        throw new Error('This is an OFF DAY. Tasks cannot be scheduled on this date.');
      }
      // 1. Mark source task as completed
      const sourceTask = tasks.find(t => t.id === sourceTaskId);
      updateTask(sourceTaskId, { status: 'completed' });

      // 2. Create the next follow-up task
      addTask({
        title: nextTitle || `Follow-up: ${sourceTask?.contactName || sourceTask?.title || 'Contact'}`,
        type: 'follow_up',
        date: nextDate,
        startTime: nextTime || '10:00',
        durationMinutes: sourceTask?.durationMinutes || 30,
        status: 'planned',
        priority: sourceTask?.priority || 'medium',
        notes: notes || '',
        category: 'Follow-up',
        project: sourceTask?.project,
        contactName: sourceTask?.contactName,
        parentTaskId: sourceTaskId,
      });

      closeFollowUpModal();
    },
    [tasks, updateTask, addTask, closeFollowUpModal, isDateOffDay]
  );

  const completeMeeting = useCallback(
    (
      sourceTaskId: string,
      outcomeNotes: string,
      followUpDate?: string,
      followUpTime?: string,
      followUpTitle?: string
    ) => {
      const sourceTask = tasks.find(t => t.id === sourceTaskId);
      updateTask(sourceTaskId, {
        status: 'completed',
        outcomeNotes,
      });

      // Optionally schedule next follow-up
      if (followUpDate) {
        if (isDateOffDay(followUpDate)) {
          throw new Error('This is an OFF DAY. Tasks cannot be scheduled on this date.');
        }
        addTask({
          title: followUpTitle || `Follow-up after meeting: ${sourceTask?.meetingWith || sourceTask?.title}`,
          type: 'follow_up',
          date: followUpDate,
          startTime: followUpTime || '10:00',
          durationMinutes: 30,
          status: 'planned',
          priority: 'high',
          notes: outcomeNotes ? `Meeting outcome context: ${outcomeNotes}` : '',
          category: 'Follow-up',
          project: sourceTask?.project,
          contactName: sourceTask?.meetingWith,
          parentTaskId: sourceTaskId,
        });
      }

      closeMeetingModal();
    },
    [tasks, updateTask, addTask, closeMeetingModal, isDateOffDay]
  );

  // Generate Month Schedule
  const generateMonthSchedule = useCallback(
    (config: MonthlyPlanConfig) => {
      const [yearStr, monthStr] = config.month.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1; // 0-indexed
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();

      // Selected templates to apply
      const activeTmpls = templates.filter(
        t => t.active && config.selectedTemplateIds.includes(t.id)
      );

      const prefix = `${config.month}-`;

      // SAFE REGENERATION & DUPLICATE PREVENTION:
      // Separate existing tasks into:
      // 1. Tasks outside this month (keep untouched)
      // 2. Non-recurring tasks in this month (meetings, follow-ups, one-time, custom - keep untouched)
      // 3. User-modified recurring tasks in this month (completed, in-progress, skipped, rescheduled - keep untouched)
      const tasksOutsideMonth = tasks.filter(t => !t.date.startsWith(prefix));
      const manualMonthTasks = tasks.filter(
        t => t.date.startsWith(prefix) && (t.type !== 'recurring' || !t.templateId)
      );
      const modifiedRecurringTasks = tasks.filter(
        t =>
          t.date.startsWith(prefix) &&
          t.type === 'recurring' &&
          t.templateId &&
          (t.status === 'completed' ||
            t.status === 'in_progress' ||
            t.status === 'skipped' ||
            t.status === 'rescheduled')
      );

      // Existing task keys to avoid duplicates: templateId + date
      const preservedKeys = new Set(
        modifiedRecurringTasks.map(t => `${t.templateId}_${t.date}`)
      );

      const newGeneratedTasks: Task[] = [];

      // Precalculate first and last working days of the month for monthly recurring rules
      let lastWorkingDayOfMonth = lastDay;
      for (let d = lastDay; d >= 1; d--) {
        const dateObj = new Date(year, monthIndex, d);
        const dateISO = formatISODate(dateObj);
        const isOff = isDateOff(dateISO, config.weeklyOffDays, config.customOffDates);
        if (!isOff) {
          lastWorkingDayOfMonth = d;
          break;
        }
      }

      let firstWorkingDayOfMonth = 1;
      for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(year, monthIndex, d);
        const dateISO = formatISODate(dateObj);
        const isOff = isDateOff(dateISO, config.weeklyOffDays, config.customOffDates);
        if (!isOff) {
          firstWorkingDayOfMonth = d;
          break;
        }
      }

      for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(year, monthIndex, d);
        const dateISO = formatISODate(dateObj);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, ..., 6 = Sat
        const isOffDay = isDateOff(dateISO, config.weeklyOffDays, config.customOffDates);

        // STRICT CENTRAL RULE: OFF DAY = ZERO TASKS! Skip completely!
        if (isOffDay) {
          continue;
        }

        const isWorkingDay = config.workingDays ? config.workingDays.includes(dayOfWeek) : true;

        activeTmpls.forEach(tmpl => {
          // Check date bounds if configured on the template
          if (tmpl.startDate && dateISO < tmpl.startDate) {
            return;
          }
          if (tmpl.endDate && dateISO > tmpl.endDate) {
            return;
          }

          let shouldGenerate = false;

          // Frequency logic - already guaranteed NOT an off day
          if (tmpl.frequency === 'daily') {
            shouldGenerate = true;
          } else if (tmpl.frequency === 'weekly' || tmpl.frequency === 'multiple_times_per_week' || tmpl.frequency === 'custom') {
            if (tmpl.daysOfWeek.includes(dayOfWeek)) {
              shouldGenerate = true;
            }
          } else if (tmpl.frequency === 'monthly') {
            if (tmpl.monthlyRule === 'last_working_day' || tmpl.recurrenceTag === 'monthly_report') {
              if (d === lastWorkingDayOfMonth) {
                shouldGenerate = true;
              }
            } else if (tmpl.monthlyRule === 'first_working_day') {
              if (d === firstWorkingDayOfMonth) {
                shouldGenerate = true;
              }
            } else {
              const targetDayOfMonth = tmpl.dayOfMonth || 1;
              if (d === targetDayOfMonth) {
                shouldGenerate = true;
              }
            }
          }

          if (shouldGenerate) {
            const taskKey = `${tmpl.id}_${dateISO}`;
            // If user already completed or modified this task, keep existing one!
            if (!preservedKeys.has(taskKey)) {
              const endTime = addMinutesToTime(tmpl.preferredTime, tmpl.estimatedDuration);
              const taskId = getRecurringTaskId(user?.id, tmpl.id, dateISO, tmpl.preferredTime);
              newGeneratedTasks.push({
                id: taskId,
                userId: user?.id || undefined,
                title: tmpl.title,
                type: 'recurring',
                date: dateISO,
                startTime: tmpl.preferredTime,
                endTime,
                durationMinutes: tmpl.estimatedDuration,
                status: 'planned',
                priority: tmpl.priority,
                notes: tmpl.notes || '',
                category: tmpl.category,
                templateId: tmpl.id,
                recurrenceTag: tmpl.recurrenceTag,
                createdAt: new Date().toISOString(),
              });
            }
          }
        });
      }

      // Add user's configured important dates for the month (prevent duplicates, skip off days)
      const existingTitlesAndDates = new Set(
        [...manualMonthTasks, ...modifiedRecurringTasks].map(t => `${t.title.toLowerCase()}_${t.date}`)
      );

      config.importantDates.forEach((item, idx) => {
        if (isDateOff(item.date, config.weeklyOffDays, config.customOffDates)) {
          return; // Skip off days!
        }
        const itemKey = `${item.title.toLowerCase()}_${item.date}`;
        if (!existingTitlesAndDates.has(itemKey)) {
          newGeneratedTasks.push({
            id: `monthly-spec-${Date.now()}-${idx}`,
            title: item.title,
            type: item.type,
            date: item.date,
            startTime: item.time || '10:00',
            durationMinutes: 45,
            status: 'planned',
            priority: 'high',
            notes: item.notes || '',
            category:
              item.type === 'meeting'
                ? 'Meetings'
                : item.type === 'follow_up'
                ? 'Follow-up'
                : 'Planning',
            isImportant: true,
            createdAt: new Date().toISOString(),
          });
          existingTitlesAndDates.add(itemKey);
        }
      });

      // Add user's one-time planned tasks (skip off days)
      if (config.oneTimeTasks && config.oneTimeTasks.length > 0) {
        config.oneTimeTasks.forEach((ot, idx) => {
          if (isDateOff(ot.date, config.weeklyOffDays, config.customOffDates)) {
            return; // Skip off days!
          }
          const otKey = `${ot.title.toLowerCase()}_${ot.date}`;
          if (!existingTitlesAndDates.has(otKey)) {
            newGeneratedTasks.push({
              id: `onetime-${Date.now()}-${idx}`,
              title: ot.title,
              type: ot.type || 'one_time',
              date: ot.date,
              startTime: ot.startTime || '09:00',
              durationMinutes: ot.durationMinutes || 30,
              status: 'planned',
              priority: ot.priority || 'medium',
              notes: ot.notes || '',
              category: ot.type === 'meeting' ? 'Meetings' : ot.type === 'follow_up' ? 'Follow-up' : 'General',
              createdAt: new Date().toISOString(),
            });
            existingTitlesAndDates.add(otKey);
          }
        });
      }

      // Update configured months, working days, and off days in settings
      const updatedConfigured = Array.from(
        new Set([...settings.configuredMonths, config.month])
      );
      const updatedNotes = {
        ...(settings.monthlyNotes || {}),
        ...(config.monthNotes ? { [config.month]: config.monthNotes } : {}),
      };

      setSettingsState(prev => ({
        ...prev,
        weeklyOffDays: config.weeklyOffDays,
        workingDays: config.workingDays || prev.workingDays,
        customOffDates: config.customOffDates || prev.customOffDates,
        workDayStart: config.workDayStart || prev.workDayStart,
        workDayEnd: config.workDayEnd || prev.workDayEnd,
        configuredMonths: updatedConfigured,
        monthlyNotes: updatedNotes,
      }));

      // Combine all preserved tasks and new generated tasks, strictly filtering out any tasks on off days
      const allNewTasks = [
        ...tasksOutsideMonth,
        ...manualMonthTasks,
        ...modifiedRecurringTasks,
        ...newGeneratedTasks,
      ].filter(t => !isDateOff(t.date, config.weeklyOffDays, config.customOffDates));

      setTasksState(allNewTasks);

      if (user?.id) {
        batchSaveTasksDocs(user.id, allNewTasks);
        saveSettingsDoc(user.id, {
          ...settings,
          weeklyOffDays: config.weeklyOffDays,
          workingDays: config.workingDays || settings.workingDays,
          customOffDates: config.customOffDates || settings.customOffDates,
          workDayStart: config.workDayStart || settings.workDayStart,
          workDayEnd: config.workDayEnd || settings.workDayEnd,
          configuredMonths: updatedConfigured,
          monthlyNotes: updatedNotes,
        });
      }

      closeMonthlySetup();
    },
    [templates, tasks, settings, closeMonthlySetup, user?.id]
  );

  // Template actions
  const updateTemplate = useCallback((template: TaskTemplate) => {
    setTemplatesState(prev => {
      const updated = prev.map(t => (t.id === template.id ? template : t));
      if (user?.id) {
        saveTemplatesDoc(user.id, updated);
      }
      setTasksState(currentTasks => {
        const syncResult = synchronizeTasksWithTemplates(currentTasks, updated, settings, undefined, user?.id);
        if (user?.id) {
          if (syncResult.newTasksCreated.length > 0) batchSaveTasksDocs(user.id, syncResult.newTasksCreated).catch(console.warn);
          if (syncResult.tasksUpdated.length > 0) batchSaveTasksDocs(user.id, syncResult.tasksUpdated).catch(console.warn);
          if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) batchDeleteTasksDocs(user.id, syncResult.oldIdsToCleanup).catch(console.warn);
          if (syncResult.tasksRemoved.length > 0) batchDeleteTasksDocs(user.id, syncResult.tasksRemoved.map(t => t.id)).catch(console.warn);
        }
        return syncResult.synchronizedTasks;
      });
      return updated;
    });
  }, [user?.id, settings]);

  const addTemplate = useCallback((tmplData: Omit<TaskTemplate, 'id'>) => {
    const newTmpl: TaskTemplate = {
      ...tmplData,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setTemplatesState(prev => {
      const updated = [...prev, newTmpl];
      if (user?.id) {
        saveTemplatesDoc(user.id, updated);
      }
      setTasksState(currentTasks => {
        const syncResult = synchronizeTasksWithTemplates(currentTasks, updated, settings, undefined, user?.id);
        if (user?.id) {
          if (syncResult.newTasksCreated.length > 0) batchSaveTasksDocs(user.id, syncResult.newTasksCreated).catch(console.warn);
          if (syncResult.tasksUpdated.length > 0) batchSaveTasksDocs(user.id, syncResult.tasksUpdated).catch(console.warn);
          if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) batchDeleteTasksDocs(user.id, syncResult.oldIdsToCleanup).catch(console.warn);
          if (syncResult.tasksRemoved.length > 0) batchDeleteTasksDocs(user.id, syncResult.tasksRemoved.map(t => t.id)).catch(console.warn);
        }
        return syncResult.synchronizedTasks;
      });
      return updated;
    });
  }, [user?.id, settings]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplatesState(prev => {
      const updated = prev.filter(t => t.id !== id);
      if (user?.id) {
        saveTemplatesDoc(user.id, updated);
      }
      setTasksState(currentTasks => {
        const syncResult = synchronizeTasksWithTemplates(currentTasks, updated, settings, undefined, user?.id);
        if (user?.id) {
          if (syncResult.newTasksCreated.length > 0) batchSaveTasksDocs(user.id, syncResult.newTasksCreated).catch(console.warn);
          if (syncResult.tasksUpdated.length > 0) batchSaveTasksDocs(user.id, syncResult.tasksUpdated).catch(console.warn);
          if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) batchDeleteTasksDocs(user.id, syncResult.oldIdsToCleanup).catch(console.warn);
          if (syncResult.tasksRemoved.length > 0) batchDeleteTasksDocs(user.id, syncResult.tasksRemoved.map(t => t.id)).catch(console.warn);
        }
        return syncResult.synchronizedTasks;
      });
      return updated;
    });
  }, [user?.id, settings]);

  // Settings
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettingsState(prev => {
      const merged = { ...prev, ...newSettings };
      if (user?.id) {
        saveSettingsDoc(user.id, merged);
      }
      setTasksState(currentTasks => {
        const syncResult = synchronizeTasksWithTemplates(currentTasks, templates, merged, undefined, user?.id);
        if (user?.id) {
          if (syncResult.newTasksCreated.length > 0) batchSaveTasksDocs(user.id, syncResult.newTasksCreated).catch(console.warn);
          if (syncResult.tasksUpdated.length > 0) batchSaveTasksDocs(user.id, syncResult.tasksUpdated).catch(console.warn);
          if (syncResult.oldIdsToCleanup && syncResult.oldIdsToCleanup.length > 0) batchDeleteTasksDocs(user.id, syncResult.oldIdsToCleanup).catch(console.warn);
          if (syncResult.tasksRemoved.length > 0) batchDeleteTasksDocs(user.id, syncResult.tasksRemoved.map(t => t.id)).catch(console.warn);
        }
        return syncResult.synchronizedTasks;
      });
      return merged;
    });
  }, [templates, user?.id]);

  // Reports
  const saveWeeklyReflection = useCallback(
    (weekId: string, startDate: string, endDate: string, reflection: WeeklyReflection) => {
      const reportId = `wreport-${weekId}`;
      const record: WeeklyReportRecord = {
        id: reportId,
        weekIdentifier: weekId,
        startDate,
        endDate,
        reflection,
        savedAt: new Date().toISOString(),
      };
      setWeeklyReportsState(prev => {
        const existing = prev.find(r => r.weekIdentifier === weekId);
        if (existing) {
          return prev.map(r => (r.weekIdentifier === weekId ? record : r));
        } else {
          return [...prev, record];
        }
      });
      if (user?.id) {
        saveReportDoc(user.id, reportId, 'weekly', weekId, record);
      }
    },
    [user?.id]
  );

  const saveMonthlyReflection = useCallback((monthId: string, reflection: MonthlyReflection) => {
    const reportId = `mreport-${monthId}`;
    const record: MonthlyReportRecord = {
      id: reportId,
      monthIdentifier: monthId,
      reflection,
      savedAt: new Date().toISOString(),
    };
    setMonthlyReportsState(prev => {
      const existing = prev.find(r => r.monthIdentifier === monthId);
      if (existing) {
        return prev.map(r => (r.monthIdentifier === monthId ? record : r));
      } else {
        return [...prev, record];
      }
    });
    if (user?.id) {
      saveReportDoc(user.id, reportId, 'monthly', monthId, record);
    }
  }, [user?.id]);

  // Reset and import/export
  const resetAll = useCallback(() => {
    const fresh = clearAndResetDefaults();
    setSettingsState(fresh.settings);
    setTemplatesState(fresh.templates);
    setTasksState(fresh.tasks);
    setWeeklyReportsState(fresh.weeklyReports);
    setMonthlyReportsState(fresh.monthlyReports);
  }, []);

  const exportData = useCallback(() => {
    return exportAllData();
  }, []);

  const importData = useCallback((jsonStr: string) => {
    const success = importAllData(jsonStr);
    if (success) {
      const fresh = loadStoredData();
      setSettingsState(fresh.settings);
      setTemplatesState(fresh.templates);
      setTasksState(fresh.tasks);
      setWeeklyReportsState(fresh.weeklyReports);
      setMonthlyReportsState(fresh.monthlyReports);
      return true;
    }
    return false;
  }, []);

  // Live Statistics Calculations
  const getDailyStats = useCallback(
    (dateISO: string): DailyStats => {
      // STRICT CENTRAL RULE: IF date.isOffDay === true OR prior to startDate -> ZERO TASKS
      if (isDateOffDay(dateISO) || (settings.startDate && dateISO < settings.startDate)) {
        return {
          total: 0,
          completed: 0,
          remaining: 0,
          pending: 0,
          inProgress: 0,
          skipped: 0,
          overdue: 0,
          rescheduled: 0,
          completionRate: 0,
        };
      }

      const dayTasks = tasks.filter(t => t.date === dateISO && (!settings.startDate || t.date >= settings.startDate));
      const total = dayTasks.length;
      const completed = dayTasks.filter(t => t.status === 'completed').length;
      const pending = dayTasks.filter(t => t.status === 'planned').length;
      const inProgress = dayTasks.filter(t => t.status === 'in_progress').length;
      const skipped = dayTasks.filter(t => t.status === 'skipped').length;
      const rescheduled = dayTasks.filter(t => t.status === 'rescheduled').length;
      const overdue = dayTasks.filter(t => isTaskOverdue(t.date, t.startTime, t.status)).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      const remaining = pending + inProgress + rescheduled;

      return {
        total,
        completed,
        remaining,
        pending,
        inProgress,
        skipped,
        overdue,
        rescheduled,
        completionRate,
      };
    },
    [tasks, settings.startDate, isDateOffDay]
  );

  const getWeeklyStats = useCallback(
    (startISO: string, endISO: string): PeriodStats => {
      const periodTasks = tasks.filter(
        t => t.date >= startISO && t.date <= endISO && (!settings.startDate || t.date >= settings.startDate)
      );
      const total = periodTasks.length;
      const completed = periodTasks.filter(t => t.status === 'completed').length;
      const pending = periodTasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length;
      const skipped = periodTasks.filter(t => t.status === 'skipped').length;
      const rescheduled = periodTasks.filter(t => t.status === 'rescheduled').length;
      const remaining = pending + rescheduled;
      const overdue = periodTasks.filter(t => isTaskOverdue(t.date, t.startTime, t.status)).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const byType: Record<TaskType, { total: number; completed: number }> = {
        recurring: { total: 0, completed: 0 },
        one_time: { total: 0, completed: 0 },
        follow_up: { total: 0, completed: 0 },
        meeting: { total: 0, completed: 0 },
        custom: { total: 0, completed: 0 },
      };

      const byRoutine: Record<string, { total: number; completed: number; title: string }> = {};

      periodTasks.forEach(t => {
        if (byType[t.type]) {
          byType[t.type].total += 1;
          if (t.status === 'completed') byType[t.type].completed += 1;
        }
        if (t.recurrenceTag) {
          if (!byRoutine[t.recurrenceTag]) {
            byRoutine[t.recurrenceTag] = { total: 0, completed: 0, title: t.title };
          }
          byRoutine[t.recurrenceTag].total += 1;
          if (t.status === 'completed') {
            byRoutine[t.recurrenceTag].completed += 1;
          }
        }
      });

      return {
        total,
        completed,
        remaining,
        pending,
        skipped,
        overdue,
        rescheduled,
        completionRate,
        byType,
        byRoutine,
      };
    },
    [tasks, settings.startDate]
  );

  const getMonthlyStats = useCallback(
    (monthISO: string): MonthlyStats => {
      const prefix = `${monthISO}-`;
      const monthTasks = tasks.filter(
        t => t.date.startsWith(prefix) && (!settings.startDate || t.date >= settings.startDate)
      );
      const total = monthTasks.length;
      const completed = monthTasks.filter(t => t.status === 'completed').length;
      const pending = monthTasks.filter(t => t.status === 'planned' || t.status === 'in_progress').length;
      const skipped = monthTasks.filter(t => t.status === 'skipped').length;
      const rescheduled = monthTasks.filter(t => t.status === 'rescheduled').length;
      const remaining = pending + rescheduled;
      const overdue = monthTasks.filter(t => isTaskOverdue(t.date, t.startTime, t.status)).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const byType: Record<TaskType, { total: number; completed: number }> = {
        recurring: { total: 0, completed: 0 },
        one_time: { total: 0, completed: 0 },
        follow_up: { total: 0, completed: 0 },
        meeting: { total: 0, completed: 0 },
        custom: { total: 0, completed: 0 },
      };

      const byRoutine: Record<string, { total: number; completed: number; title: string }> = {};
      let followUpsCompleted = 0;
      let meetingsCompleted = 0;
      let contentCompleted = 0;

      monthTasks.forEach(t => {
        if (byType[t.type]) {
          byType[t.type].total += 1;
          if (t.status === 'completed') byType[t.type].completed += 1;
        }
        if (t.recurrenceTag) {
          if (!byRoutine[t.recurrenceTag]) {
            byRoutine[t.recurrenceTag] = { total: 0, completed: 0, title: t.title };
          }
          byRoutine[t.recurrenceTag].total += 1;
          if (t.status === 'completed') {
            byRoutine[t.recurrenceTag].completed += 1;
          }
        }
        if (t.status === 'completed') {
          if (t.type === 'follow_up') followUpsCompleted += 1;
          if (t.type === 'meeting') meetingsCompleted += 1;
          if (t.category === 'Content') contentCompleted += 1;
        }
      });

      // Weekly breakdown of the month (divide into 4-5 weeks)
      const [y, m] = monthISO.split('-').map(Number);
      const totalDays = new Date(y, m, 0).getDate();
      const byWeek: Array<{ weekName: string; total: number; completed: number; completionRate: number }> = [];

      for (let w = 0; w < Math.ceil(totalDays / 7); w++) {
        const startDay = w * 7 + 1;
        const endDay = Math.min((w + 1) * 7, totalDays);
        const startStr = `${monthISO}-${String(startDay).padStart(2, '0')}`;
        const endStr = `${monthISO}-${String(endDay).padStart(2, '0')}`;

        const wTasks = monthTasks.filter(t => t.date >= startStr && t.date <= endStr);
        const wTotal = wTasks.length;
        const wComp = wTasks.filter(t => t.status === 'completed').length;
        const wRate = wTotal > 0 ? Math.round((wComp / wTotal) * 100) : 0;

        byWeek.push({
          weekName: `Week ${w + 1} (${startDay}–${endDay})`,
          total: wTotal,
          completed: wComp,
          completionRate: wRate,
        });
      }

      return {
        total,
        completed,
        remaining,
        pending,
        skipped,
        overdue,
        rescheduled,
        completionRate,
        byType,
        byRoutine,
        byWeek,
        followUpsCompleted,
        meetingsCompleted,
        contentCompleted,
      };
    },
    [tasks, settings.startDate]
  );

  // Memoized Live stats for current day, week, month
  const todayStats = useMemo(() => getDailyStats(todayISO), [getDailyStats, todayISO]);

  const thisWeekRange = useMemo(() => getWeekRange(todayISO), [todayISO]);
  const thisWeekStats = useMemo(
    () => getWeeklyStats(thisWeekRange.startISO, thisWeekRange.endISO),
    [getWeeklyStats, thisWeekRange]
  );

  const thisMonthISO = useMemo(() => todayISO.slice(0, 7), [todayISO]);
  const thisMonthStats = useMemo(() => getMonthlyStats(thisMonthISO), [getMonthlyStats, thisMonthISO]);

  // Upcoming items for dashboard
  const upcomingTasks = useMemo(() => {
    const today = parseISODate(todayISO);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowISO = formatISODate(tomorrow);

    const tomorrowTasks = tasks
      .filter(t => t.date === tomorrowISO && t.status !== 'completed' && t.status !== 'skipped')
      .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));

    const upcomingMeetings = tasks
      .filter(t => t.type === 'meeting' && t.date >= todayISO && t.status !== 'completed' && t.status !== 'skipped')
      .sort((a, b) => (a.date + (a.startTime || '99:99')).localeCompare(b.date + (b.startTime || '99:99')))
      .slice(0, 5);

    const upcomingFollowUps = tasks
      .filter(t => t.type === 'follow_up' && t.date >= todayISO && t.status !== 'completed' && t.status !== 'skipped')
      .sort((a, b) => (a.date + (a.startTime || '99:99')).localeCompare(b.date + (b.startTime || '99:99')))
      .slice(0, 5);

    const importantUpcoming = tasks
      .filter(t => t.isImportant && t.date >= todayISO && t.status !== 'completed' && t.status !== 'skipped')
      .sort((a, b) => (a.date + (a.startTime || '99:99')).localeCompare(b.date + (b.startTime || '99:99')))
      .slice(0, 5);

    return {
      tomorrow: tomorrowTasks,
      upcomingMeetings,
      upcomingFollowUps,
      importantUpcoming,
    };
  }, [tasks, todayISO]);

  return (
    <WorkPlanContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        authLoading,
        login,
        logout,
        refreshWorkspace,
        tasks,
        templates,
        settings,
        weeklyReports,
        monthlyReports,
        activeNavTab,
        setActiveNavTab,
        plannerSubTab,
        setPlannerSubTab,
        reportsSubTab,
        setReportsSubTab,
        selectedDate,
        setSelectedDate,
        currentMonth,
        setCurrentMonth,
        isDateOffDay,
        getNextWorkingDayDate,
        isMonthlySetupOpen,
        openMonthlySetup,
        closeMonthlySetup,
        isTaskModalOpen,
        editingTask,
        taskModalDefaultDate,
        taskModalDefaultType,
        openCreateTask,
        openEditTask,
        closeTaskModal,
        isFollowUpModalOpen,
        followUpSourceTask,
        openFollowUpModal,
        closeFollowUpModal,
        isMeetingModalOpen,
        meetingSourceTask,
        openMeetingModal,
        closeMeetingModal,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        startTask,
        completeTask,
        skipTask,
        rescheduleTask,
        updateTaskNotes,
        saveDailyNotes,
        completeFollowUpAndScheduleNext,
        completeMeeting,
        generateMonthSchedule,
        updateTemplate,
        addTemplate,
        deleteTemplate,
        updateSettings,
        startFromToday,
        isTaskActionable,
        saveWeeklyReflection,
        saveMonthlyReflection,
        syncTasks,
        todayStats,
        getDailyStats,
        thisWeekStats,
        getWeeklyStats,
        thisMonthStats,
        getMonthlyStats,
        upcomingTasks,
        exportData,
        importData,
        resetAll,
      }}
    >
      {children}
    </WorkPlanContext.Provider>
  );
};

export function useWorkPlan(): WorkPlanContextType {
  const context = useContext(WorkPlanContext);
  if (!context) {
    throw new Error('useWorkPlan must be used within a WorkPlanProvider');
  }
  return context;
}
