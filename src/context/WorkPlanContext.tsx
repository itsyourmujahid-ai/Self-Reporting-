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
} from '../types';
import {
  loadStoredData,
  saveSettings,
  saveTemplates,
  saveTasks,
  saveWeeklyReports,
  saveMonthlyReports,
  clearAndResetDefaults,
  importAllData,
  exportAllData,
} from '../utils/storage';
import {
  getTodayISO,
  formatISODate,
  parseISODate,
  getWeekRange,
  addMinutesToTime,
  getWeekIdentifier,
  isTaskOverdue,
} from '../utils/dateUtils';

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

  // Reports
  saveWeeklyReflection: (weekId: string, startDate: string, endDate: string, reflection: WeeklyReflection) => void;
  saveMonthlyReflection: (monthId: string, reflection: MonthlyReflection) => void;

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

  // Import / Export
  exportData: () => string;
  importData: (jsonStr: string) => boolean;
  resetAll: () => void;
}

const WorkPlanContext = createContext<WorkPlanContextType | null>(null);

export const WorkPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial persistent state
  const [initialData] = useState(() => loadStoredData());

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

  // Auto-sync state to localStorage
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveWeeklyReports(weeklyReports);
  }, [weeklyReports]);

  useEffect(() => {
    saveMonthlyReports(monthlyReports);
  }, [monthlyReports]);

  // Modal openers
  const openMonthlySetup = useCallback(() => setIsMonthlySetupOpen(true), []);
  const closeMonthlySetup = useCallback(() => setIsMonthlySetupOpen(false), []);

  const openCreateTask = useCallback((defaultDate?: string, defaultType?: TaskType) => {
    setEditingTask(null);
    setTaskModalDefaultDate(defaultDate || selectedDate || getTodayISO());
    setTaskModalDefaultType(defaultType || 'one_time');
    setIsTaskModalOpen(true);
  }, [selectedDate]);

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
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    setTasksState(prev => [...prev, newTask]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasksState(prev =>
      prev.map(task => {
        if (task.id === id) {
          const updated = { ...task, ...updates };
          if (updates.status === 'completed' && !task.completedAt) {
            updated.completedAt = new Date().toISOString();
          } else if (updates.status && updates.status !== 'completed') {
            updated.completedAt = undefined;
          }
          return updated;
        }
        return task;
      })
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasksState(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleTaskStatus = useCallback((id: string, explicitStatus?: TaskStatus) => {
    setTasksState(prev =>
      prev.map(task => {
        if (task.id !== id) return task;
        let newStatus: TaskStatus;
        if (explicitStatus) {
          newStatus = explicitStatus;
        } else {
          newStatus = task.status === 'completed' ? 'planned' : 'completed';
        }
        return {
          ...task,
          status: newStatus,
          completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
        };
      })
    );
  }, []);

  const startTask = useCallback((id: string) => {
    setTasksState(prev =>
      prev.map(task => {
        // Only one task active at a time: pause previously active task back to planned
        if (task.status === 'in_progress' && task.id !== id) {
          return { ...task, status: 'planned' as TaskStatus };
        }
        if (task.id === id) {
          return {
            ...task,
            status: 'in_progress' as TaskStatus,
            startedAt: task.startedAt || new Date().toISOString(),
          };
        }
        return task;
      })
    );
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasksState(prev =>
      prev.map(task => {
        if (task.id === id) {
          return {
            ...task,
            status: 'completed' as TaskStatus,
            completedAt: new Date().toISOString(),
          };
        }
        return task;
      })
    );
  }, []);

  const skipTask = useCallback((id: string, reason?: string) => {
    setTasksState(prev =>
      prev.map(task => {
        if (task.id === id) {
          return {
            ...task,
            status: 'skipped' as TaskStatus,
            skippedReason: reason !== undefined ? reason.trim() : task.skippedReason || '',
          };
        }
        return task;
      })
    );
  }, []);

  const rescheduleTask = useCallback((id: string, newDate: string, newTime?: string) => {
    setTasksState(prev =>
      prev.map(task => {
        if (task.id !== id) return task;
        return {
          ...task,
          date: newDate,
          startTime: newTime !== undefined && newTime !== '' ? newTime : task.startTime,
          status: 'rescheduled' as TaskStatus,
          originalDate: task.originalDate || task.date,
          rescheduledDate: newDate,
          rescheduledAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  const updateTaskNotes = useCallback((id: string, notes: string) => {
    setTasksState(prev =>
      prev.map(task => {
        if (task.id === id) {
          return { ...task, notes };
        }
        return task;
      })
    );
  }, []);

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
    [tasks, updateTask, addTask, closeFollowUpModal]
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
    [tasks, updateTask, addTask, closeMeetingModal]
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
        const dObj = new Date(year, monthIndex, d);
        const dow = dObj.getDay();
        const isOff = config.weeklyOffDays.includes(dow);
        const isWork = config.workingDays ? config.workingDays.includes(dow) : !isOff;
        if (!isOff && isWork) {
          lastWorkingDayOfMonth = d;
          break;
        }
      }

      let firstWorkingDayOfMonth = 1;
      for (let d = 1; d <= lastDay; d++) {
        const dObj = new Date(year, monthIndex, d);
        const dow = dObj.getDay();
        const isOff = config.weeklyOffDays.includes(dow);
        const isWork = config.workingDays ? config.workingDays.includes(dow) : !isOff;
        if (!isOff && isWork) {
          firstWorkingDayOfMonth = d;
          break;
        }
      }

      for (let d = 1; d <= lastDay; d++) {
        const dateObj = new Date(year, monthIndex, d);
        const dateISO = formatISODate(dateObj);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, ..., 6 = Sat
        const isOffDay = config.weeklyOffDays.includes(dayOfWeek);
        const isWorkingDay = config.workingDays ? config.workingDays.includes(dayOfWeek) : !isOffDay;

        activeTmpls.forEach(tmpl => {
          // Check date bounds if configured on the template
          if (tmpl.startDate && dateISO < tmpl.startDate) {
            return;
          }
          if (tmpl.endDate && dateISO > tmpl.endDate) {
            return;
          }

          let shouldGenerate = false;

          // Frequency logic
          if (tmpl.frequency === 'daily') {
            // Daily tasks generate on working days by default
            if (tmpl.generateOnlyOnWorkingDays === false) {
              shouldGenerate = true;
            } else if (!isOffDay && isWorkingDay) {
              shouldGenerate = true;
            }
          } else if (tmpl.frequency === 'weekly' || tmpl.frequency === 'multiple_times_per_week' || tmpl.frequency === 'custom') {
            // Check if this day of week matches template configuration and is not an off day
            if (tmpl.daysOfWeek.includes(dayOfWeek) && !isOffDay) {
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
              newGeneratedTasks.push({
                id: `gen-${tmpl.id}-${dateISO}`,
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

      // Add user's configured important dates for the month (prevent duplicates)
      const existingTitlesAndDates = new Set(
        [...manualMonthTasks, ...modifiedRecurringTasks].map(t => `${t.title.toLowerCase()}_${t.date}`)
      );

      config.importantDates.forEach((item, idx) => {
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

      // Add user's one-time planned tasks
      if (config.oneTimeTasks && config.oneTimeTasks.length > 0) {
        config.oneTimeTasks.forEach((ot, idx) => {
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
        workDayStart: config.workDayStart || prev.workDayStart,
        workDayEnd: config.workDayEnd || prev.workDayEnd,
        configuredMonths: updatedConfigured,
        monthlyNotes: updatedNotes,
      }));

      // Combine all preserved tasks and new generated tasks
      setTasksState([
        ...tasksOutsideMonth,
        ...manualMonthTasks,
        ...modifiedRecurringTasks,
        ...newGeneratedTasks,
      ]);

      closeMonthlySetup();
    },
    [templates, tasks, settings, closeMonthlySetup]
  );

  // Template actions
  const updateTemplate = useCallback((template: TaskTemplate) => {
    setTemplatesState(prev => prev.map(t => (t.id === template.id ? template : t)));
  }, []);

  const addTemplate = useCallback((tmplData: Omit<TaskTemplate, 'id'>) => {
    const newTmpl: TaskTemplate = {
      ...tmplData,
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setTemplatesState(prev => [...prev, newTmpl]);
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplatesState(prev => prev.filter(t => t.id !== id));
  }, []);

  // Settings
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettingsState(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Reports
  const saveWeeklyReflection = useCallback(
    (weekId: string, startDate: string, endDate: string, reflection: WeeklyReflection) => {
      setWeeklyReportsState(prev => {
        const existing = prev.find(r => r.weekIdentifier === weekId);
        if (existing) {
          return prev.map(r =>
            r.weekIdentifier === weekId
              ? { ...r, reflection, savedAt: new Date().toISOString() }
              : r
          );
        } else {
          return [
            ...prev,
            {
              id: `wreport-${weekId}`,
              weekIdentifier: weekId,
              startDate,
              endDate,
              reflection,
              savedAt: new Date().toISOString(),
            },
          ];
        }
      });
    },
    []
  );

  const saveMonthlyReflection = useCallback((monthId: string, reflection: MonthlyReflection) => {
    setMonthlyReportsState(prev => {
      const existing = prev.find(r => r.monthIdentifier === monthId);
      if (existing) {
        return prev.map(r =>
          r.monthIdentifier === monthId
            ? { ...r, reflection, savedAt: new Date().toISOString() }
            : r
        );
      } else {
        return [
          ...prev,
          {
            id: `mreport-${monthId}`,
            monthIdentifier: monthId,
            reflection,
            savedAt: new Date().toISOString(),
          },
        ];
      }
    });
  }, []);

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
      const dayTasks = tasks.filter(t => t.date === dateISO);
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
    [tasks]
  );

  const getWeeklyStats = useCallback(
    (startISO: string, endISO: string): PeriodStats => {
      const periodTasks = tasks.filter(t => t.date >= startISO && t.date <= endISO);
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
    [tasks]
  );

  const getMonthlyStats = useCallback(
    (monthISO: string): MonthlyStats => {
      const prefix = `${monthISO}-`;
      const monthTasks = tasks.filter(t => t.date.startsWith(prefix));
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
    [tasks]
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
        saveWeeklyReflection,
        saveMonthlyReflection,
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
