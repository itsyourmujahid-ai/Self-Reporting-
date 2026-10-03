export type TaskType = 'recurring' | 'one_time' | 'follow_up' | 'meeting' | 'custom';

export type TaskStatus = 'planned' | 'in_progress' | 'completed' | 'skipped' | 'rescheduled' | 'overdue';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low' | 'urgent';

export interface Task {
  id: string;
  title: string;
  type: TaskType;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm or empty/undefined if unscheduled
  endTime?: string; // HH:mm
  durationMinutes: number;
  status: TaskStatus;
  priority: TaskPriority;
  notes: string;
  category: string;
  project?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  skippedReason?: string;
  originalDate?: string;
  rescheduledDate?: string;
  rescheduledAt?: string;
  isImportant?: boolean;
  
  // Specific to follow-up tasks
  contactName?: string;
  nextFollowUpDate?: string;
  parentTaskId?: string;

  // Specific to meeting tasks
  meetingWith?: string;
  locationOrLink?: string;
  outcomeNotes?: string;

  // Specific to recurring tasks
  templateId?: string;
  recurrenceTag?: string; // e.g. "linkedin_post", "daily_poster", etc.
}

export type FrequencyType = 'daily' | 'weekly' | 'multiple_times_per_week' | 'monthly' | 'custom';

export type MonthlyRuleType = 'last_working_day' | 'first_working_day' | 'specific_day';

export interface TaskTemplate {
  id: string;
  title: string;
  type: TaskType;
  frequency: FrequencyType;
  // For weekly / multiple times per week / custom: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  daysOfWeek: number[]; 
  timesPerWeek?: number; // e.g., 3 for LinkedIn / X
  dayOfMonth?: number; // for monthly recurring (1-31)
  monthlyRule?: MonthlyRuleType; // for monthly tasks (e.g. 'last_working_day')
  generateOnlyOnWorkingDays?: boolean; // defaults to true for daily
  preferredTime: string; // HH:mm
  estimatedDuration: number; // minutes
  category: string;
  priority: TaskPriority;
  active: boolean;
  notes?: string;
  recurrenceTag?: string;
  startDate?: string; // Optional start date constraint (YYYY-MM-DD)
  endDate?: string; // Optional end date constraint (YYYY-MM-DD)
}

export interface UserSettings {
  userName: string;
  // Default weekly off days: Friday (5) and Saturday (6)
  weeklyOffDays: number[];
  workingDays: number[];
  customOffDates?: string[]; // Optional specific custom off dates (YYYY-MM-DD)
  workDayStart: string; // "09:00"
  workDayEnd: string; // "18:00"
  defaultTaskDuration: number; // in minutes
  defaultPriority: TaskPriority;
  categories: string[];
  projects: string[];
  configuredMonths: string[]; // ['2026-09', '2026-10']
  monthlyNotes?: Record<string, string>; // month (YYYY-MM) -> notes
  dailyNotes?: Record<string, string>; // date (YYYY-MM-DD) -> daily reflection notes
}

export interface WeeklyReflection {
  accomplishments?: string;
  wentWell: string;
  failedOrDelayed: string;
  causesOfDelays?: string;
  nextWeekFocus: string;
  importantNotes?: string;
}

export interface WeeklyReportRecord {
  id: string;
  weekIdentifier: string; // e.g. "2026-W39"
  startDate: string;
  endDate: string;
  reflection: WeeklyReflection;
  savedAt: string;
}

export interface MonthlyReflection {
  majorAccomplishments: string;
  problems: string;
  missedGoals: string;
  lessonsLearned: string;
  nextMonthPriorities: string;
  importantNotes?: string;
}

export interface MonthlyReportRecord {
  id: string;
  monthIdentifier: string; // e.g. "2026-09"
  reflection: MonthlyReflection;
  savedAt: string;
}

export interface OneTimePlannedTask {
  date: string;
  title: string;
  type: TaskType;
  startTime: string;
  durationMinutes: number;
  priority: TaskPriority;
  notes?: string;
}

export interface MonthlyPlanConfig {
  month: string; // YYYY-MM
  workingDays: number[];
  weeklyOffDays: number[];
  customOffDates?: string[];
  workDayStart: string;
  workDayEnd: string;
  selectedTemplateIds: string[];
  importantDates: Array<{
    date: string;
    title: string;
    type: TaskType;
    time: string;
    notes?: string;
  }>;
  oneTimeTasks?: OneTimePlannedTask[];
  monthNotes?: string;
  regenerateOption?: 'replace_recurring_only' | 'keep_existing_append_missing';
}

export type ActiveNavTab = 'dashboard' | 'today' | 'calendar' | 'planner' | 'tasks' | 'reports' | 'settings';
export type PlannerSubTab = 'daily' | 'weekly' | 'monthly';
export type ReportsSubTab = 'weekly' | 'monthly';
