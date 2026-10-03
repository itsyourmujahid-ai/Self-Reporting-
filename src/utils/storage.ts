import { Task, TaskTemplate, UserSettings, WeeklyReportRecord, MonthlyReportRecord } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_TEMPLATES, generateInitialTasks, INITIAL_WEEKLY_REPORTS, INITIAL_MONTHLY_REPORTS } from './defaults';
import { isDateOff } from './dateUtils';

const STORAGE_KEYS = {
  TOKEN: 'self_reporting_auth_token_v1',
  USER: 'self_reporting_auth_user_v1',
  SETTINGS: 'self_reporting_settings_v1',
  TEMPLATES: 'self_reporting_templates_v1',
  TASKS: 'self_reporting_tasks_v1',
  WEEKLY_REPORTS: 'self_reporting_weekly_reports_v1',
  MONTHLY_REPORTS: 'self_reporting_monthly_reports_v1',
};

export interface AuthSessionUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
}

export interface StoredAppState {
  settings: UserSettings;
  templates: TaskTemplate[];
  tasks: Task[];
  weeklyReports: WeeklyReportRecord[];
  monthlyReports: MonthlyReportRecord[];
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }
}

export function getStoredUser(): AuthSessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthSessionUser | null): void {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

export function clearAuthSession(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// Helper for authenticated requests
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
}

// --- API Methods ---

export async function apiRegister(email: string, password: string, displayName?: string) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create account.');
  return data;
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to log in.');
  return data;
}

export async function apiGetMe() {
  const res = await authFetch('/api/auth/me');
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as AuthSessionUser;
}

export async function apiLogout() {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.warn('Logout API error:', e);
  } finally {
    clearAuthSession();
  }
}

// User-Isolated Database Operations
export async function apiLoadWorkspace(): Promise<StoredAppState | null> {
  try {
    const res = await authFetch('/api/data');
    if (!res.ok) return null;
    const data = await res.json();

    const settings: UserSettings = data.settings || DEFAULT_SETTINGS;
    const templates: TaskTemplate[] = data.templates || DEFAULT_TEMPLATES;
    let tasks: Task[] = data.tasks || [];

    // STRICT RULE: OFF DAY = ZERO TASKS
    tasks = tasks.filter(t => !isDateOff(t.date, settings.weeklyOffDays, settings.customOffDates));

    const state: StoredAppState = {
      settings,
      templates,
      tasks,
      weeklyReports: data.weeklyReports || [],
      monthlyReports: data.monthlyReports || [],
    };

    // Save to local cache for offline resilience
    saveLocalState(state);
    return state;
  } catch (err) {
    console.warn('Could not fetch from server API, using local cache:', err);
    return null;
  }
}

export async function apiSaveSettings(settings: UserSettings): Promise<void> {
  saveLocalSettings(settings);
  try {
    await authFetch('/api/data/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  } catch (e) {
    console.warn('Server save settings error:', e);
  }
}

export async function apiSaveTemplates(templates: TaskTemplate[]): Promise<void> {
  saveLocalTemplates(templates);
  try {
    await authFetch('/api/data/templates', {
      method: 'PUT',
      body: JSON.stringify(templates),
    });
  } catch (e) {
    console.warn('Server save templates error:', e);
  }
}

export async function apiSaveTask(task: Task): Promise<void> {
  try {
    await authFetch('/api/data/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  } catch (e) {
    console.warn('Server save task error:', e);
  }
}

export async function apiDeleteTask(id: string): Promise<void> {
  try {
    await authFetch(`/api/data/tasks/${id}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('Server delete task error:', e);
  }
}

export async function apiBatchTasks(tasks: Task[], deleteRange?: { startDate: string; endDate: string }): Promise<void> {
  try {
    await authFetch('/api/data/tasks/batch', {
      method: 'POST',
      body: JSON.stringify({ tasks, deleteRange }),
    });
  } catch (e) {
    console.warn('Server batch tasks error:', e);
  }
}

export async function apiSaveReport(id: string, type: 'weekly' | 'monthly', periodKey: string, report: any): Promise<void> {
  try {
    await authFetch('/api/data/reports', {
      method: 'POST',
      body: JSON.stringify({ id, type, periodKey, report }),
    });
  } catch (e) {
    console.warn('Server save report error:', e);
  }
}

// Super Admin APIs
export async function apiGetAdminOverview() {
  const res = await authFetch('/api/admin/overview');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch admin overview.');
  }
  return res.json();
}

export async function apiGetAdminUsers() {
  const res = await authFetch('/api/admin/users');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch user list.');
  }
  return res.json();
}

export async function apiToggleUserStatus(id: string, status: 'active' | 'suspended') {
  const res = await authFetch(`/api/admin/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to update user status.');
  }
  return res.json();
}

export async function apiGetAdminAuditLogs() {
  const res = await authFetch('/api/admin/audit-logs');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch audit logs.');
  }
  return res.json();
}

// --- Local Storage Cache Functions ---

function saveLocalState(state: StoredAppState): void {
  saveLocalSettings(state.settings);
  saveLocalTemplates(state.templates);
  saveLocalTasks(state.tasks);
  saveLocalWeeklyReports(state.weeklyReports);
  saveLocalMonthlyReports(state.monthlyReports);
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
    tasks = tasks.filter(t => !isDateOff(t.date, settings.weeklyOffDays, settings.customOffDates));

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

export function saveLocalSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}

export function saveLocalTemplates(templates: TaskTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.error('Failed to save templates to localStorage:', e);
  }
}

export function saveLocalTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to localStorage:', e);
  }
}

export function saveLocalWeeklyReports(reports: WeeklyReportRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WEEKLY_REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save weekly reports to localStorage:', e);
  }
}

export function saveLocalMonthlyReports(reports: MonthlyReportRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MONTHLY_REPORTS, JSON.stringify(reports));
  } catch (e) {
    console.error('Failed to save monthly reports to localStorage:', e);
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

export function exportAllData(): string {
  const data = loadStoredData();
  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') return false;
    if (parsed.settings) saveLocalSettings(parsed.settings);
    if (parsed.templates) saveLocalTemplates(parsed.templates);
    if (parsed.tasks) saveLocalTasks(parsed.tasks);
    if (parsed.weeklyReports) saveLocalWeeklyReports(parsed.weeklyReports);
    if (parsed.monthlyReports) saveLocalMonthlyReports(parsed.monthlyReports);
    return true;
  } catch (e) {
    console.error('Failed to import data:', e);
    return false;
  }
}

