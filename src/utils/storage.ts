import { Task, TaskTemplate, UserSettings, WeeklyReportRecord, MonthlyReportRecord } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES, generateInitialTasks, generateDayRecurringTasks, INITIAL_WEEKLY_REPORTS, INITIAL_MONTHLY_REPORTS } from './defaults';
import { getTodayISO, isDateOff } from './dateUtils';

const STORAGE_KEYS = {
  SETTINGS: 'self_reporting_settings_v1',
  TEMPLATES: 'self_reporting_templates_v1',
  TASKS: 'self_reporting_tasks_v1',
  WEEKLY_REPORTS: 'self_reporting_weekly_reports_v1',
  MONTHLY_REPORTS: 'self_reporting_monthly_reports_v1',
};

export interface StoredAppState {
  settings: UserSettings;
  templates: TaskTemplate[];
  tasks: Task[];
  weeklyReports: WeeklyReportRecord[];
  monthlyReports: MonthlyReportRecord[];
}

export function loadStoredData(): StoredAppState {
  try {
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const rawTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    const rawWeekly = localStorage.getItem(STORAGE_KEYS.WEEKLY_REPORTS);
    const rawMonthly = localStorage.getItem(STORAGE_KEYS.MONTHLY_REPORTS);

    const settings: UserSettings = rawSettings ? JSON.parse(rawSettings) : DEFAULT_SETTINGS;
    const templates: TaskTemplate[] = rawTemplates ? JSON.parse(rawTemplates) : DEFAULT_TEMPLATES;
    let tasks: Task[] = rawTasks ? JSON.parse(rawTasks) : generateInitialTasks();

    // STRICT CENTRAL RULE: OFF DAY = ZERO TASKS!
    // Purge any stored tasks that fall on configured off days
    tasks = tasks.filter(t => !isDateOff(t.date, settings.weeklyOffDays, settings.customOffDates));

    // Ensure working days have recurring tasks generated if empty
    const todayISO = getTodayISO();
    const isTodayOff = isDateOff(todayISO, settings.weeklyOffDays, settings.customOffDates);
    if (!isTodayOff) {
      const hasTodayTasks = tasks.some(t => t.date === todayISO);
      if (!hasTodayTasks) {
        const generatedToday = generateDayRecurringTasks(todayISO, templates, settings);
        tasks = [...tasks, ...generatedToday];
      }
    }

    return {
      settings,
      templates,
      tasks,
      weeklyReports: rawWeekly ? JSON.parse(rawWeekly) : INITIAL_WEEKLY_REPORTS,
      monthlyReports: rawMonthly ? JSON.parse(rawMonthly) : INITIAL_MONTHLY_REPORTS,
    };
  } catch (error) {
    console.error('Error loading data from localStorage, falling back to defaults:', error);
    return {
      settings: DEFAULT_SETTINGS,
      templates: DEFAULT_TEMPLATES,
      tasks: generateInitialTasks(),
      weeklyReports: INITIAL_WEEKLY_REPORTS,
      monthlyReports: INITIAL_MONTHLY_REPORTS,
    };
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}

export function saveTemplates(templates: TaskTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates to localStorage:', e);
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage:', e);
  }
}

export function saveWeeklyReports(reports: WeeklyReportRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WEEKLY_REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save weekly reports to localStorage:', e);
  }
}

export function saveMonthlyReports(reports: MonthlyReportRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MONTHLY_REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save monthly reports to localStorage:', e);
  }
}

export function exportAllData(): string {
  const data = loadStoredData();
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.settings) saveSettings(parsed.settings);
    if (parsed.templates) saveTemplates(parsed.templates);
    if (parsed.tasks) saveTasks(parsed.tasks);
    if (parsed.weeklyReports) saveWeeklyReports(parsed.weeklyReports);
    if (parsed.monthlyReports) saveMonthlyReports(parsed.monthlyReports);
    return true;
  } catch (e) {
    console.error('Failed to import data:', e);
    return false;
  }
}

export function clearAndResetDefaults(): StoredAppState {
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.WEEKLY_REPORTS);
  localStorage.removeItem(STORAGE_KEYS.MONTHLY_REPORTS);
  return {
    settings: DEFAULT_SETTINGS,
    templates: DEFAULT_TEMPLATES,
    tasks: generateInitialTasks(),
    weeklyReports: INITIAL_WEEKLY_REPORTS,
    monthlyReports: INITIAL_MONTHLY_REPORTS,
  };
}
