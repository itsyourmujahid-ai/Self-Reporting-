export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse YYYY-MM-DD string to local Date object (at midnight)
 */
export function parseISODate(isoString: string): Date {
  const [year, month, day] = isoString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0);
}

/**
 * Get today's ISO date string
 */
export function getTodayISO(): string {
  return formatISODate(new Date());
}

/**
 * Format date for display: "Tuesday, Sep 29, 2026"
 */
export function formatDisplayDate(isoString: string): string {
  const date = parseISODate(isoString);
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${dayName}, ${monthName} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Format date short: "Sep 29"
 */
export function formatShortDate(isoString: string): string {
  const date = parseISODate(isoString);
  const monthName = MONTH_NAMES[date.getMonth()].slice(0, 3);
  return `${monthName} ${date.getDate()}`;
}

/**
 * Get ISO week string: "2026-W39"
 */
export function getWeekIdentifier(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Get start and end dates of the week for a given date
 * Assumes week starts on Sunday (day 0) or can start on Monday
 */
export function getWeekRange(dateInput: Date | string, startOnSunday = true): { start: Date; end: Date; startISO: string; endISO: string } {
  const date = typeof dateInput === 'string' ? parseISODate(dateInput) : new Date(dateInput);
  const day = date.getDay();
  const diff = startOnSunday ? -day : (day === 0 ? -6 : 1 - day);
  
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  
  return {
    start,
    end,
    startISO: formatISODate(start),
    endISO: formatISODate(end),
  };
}

/**
 * Get all 7 days of the week starting from start date
 */
export function getDaysOfWeek(startDate: Date): string[] {
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    days.push(formatISODate(d));
  }
  return days;
}

/**
 * Calculate end time by adding duration (minutes) to HH:mm
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMins = h * 60 + m + minutes;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Check if a task is overdue relative to today and current time
 */
export function isTaskOverdue(taskDate: string, startTime: string | undefined, status: string): boolean {
  if (status === 'completed' || status === 'skipped' || status === 'rescheduled') {
    return false;
  }
  const todayISO = getTodayISO();
  if (taskDate < todayISO) {
    return true;
  }
  if (taskDate === todayISO && startTime) {
    const now = new Date();
    const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return startTime < currentHHmm;
  }
  return false;
}

/**
 * Month calendar matrix generation
 * Returns array of { dateISO: string, isCurrentMonth: boolean, dayNumber: number, dayOfWeek: number }
 */
export interface CalendarCell {
  dateISO: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  dayOfWeek: number;
}

export function getCalendarGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon ...
  const totalDaysInMonth = lastDay.getDate();
  
  const cells: CalendarCell[] = [];
  
  // Previous month trailing days
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, monthIndex - 1, prevMonthLastDay - i);
    cells.push({
      dateISO: formatISODate(prevDate),
      dayNumber: prevDate.getDate(),
      isCurrentMonth: false,
      dayOfWeek: prevDate.getDay(),
    });
  }
  
  // Current month days
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const currDate = new Date(year, monthIndex, d);
    cells.push({
      dateISO: formatISODate(currDate),
      dayNumber: d,
      isCurrentMonth: true,
      dayOfWeek: currDate.getDay(),
    });
  }
  
  // Next month leading days to complete full grid (multiple of 7, up to 35 or 42)
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let n = 1; n <= remaining; n++) {
    const nextDate = new Date(year, monthIndex + 1, n);
    cells.push({
      dateISO: formatISODate(nextDate),
      dayNumber: n,
      isCurrentMonth: false,
      dayOfWeek: nextDate.getDay(),
    });
  }
  
  return cells;
}

/**
 * Check if an ISO date string is configured as an OFF DAY.
 * Central scheduling rule: IF date.isOffDay === true -> ZERO TASKS.
 */
export function isDateOff(
  isoDate: string,
  weeklyOffDays: number[] = [5, 6],
  customOffDates: string[] = []
): boolean {
  if (!isoDate) return false;
  if (customOffDates && customOffDates.includes(isoDate)) {
    return true;
  }
  const date = parseISODate(isoDate);
  return (weeklyOffDays || []).includes(date.getDay());
}

/**
 * Check if a date string is a weekly off day (delegates to isDateOff for complete off day support)
 */
export function isWeeklyOff(
  isoDate: string,
  weeklyOffDays: number[] = [5, 6],
  customOffDates: string[] = []
): boolean {
  return isDateOff(isoDate, weeklyOffDays, customOffDates);
}

/**
 * Find the next working day starting from a given date.
 * If the given date is an off day, advances day-by-day until a non-off working day is found.
 */
export function getNextWorkingDay(
  startDateISO: string,
  weeklyOffDays: number[] = [5, 6],
  customOffDates: string[] = []
): string {
  const d = parseISODate(startDateISO);
  let currentISO = formatISODate(d);
  while (isDateOff(currentISO, weeklyOffDays, customOffDates)) {
    d.setDate(d.getDate() + 1);
    currentISO = formatISODate(d);
  }
  return currentISO;
}

/**
 * Calculate working days and off days for a specific year and month (0-indexed month)
 */
export function getMonthWorkingAndOffDays(
  year: number,
  monthIndex: number,
  weeklyOffDays: number[] = [5, 6],
  customOffDates: string[] = []
): { totalDays: number; workingDaysCount: number; offDaysCount: number } {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  let workingDaysCount = 0;
  let offDaysCount = 0;

  for (let d = 1; d <= lastDay; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dateISO = formatISODate(dateObj);
    if (isDateOff(dateISO, weeklyOffDays, customOffDates)) {
      offDaysCount++;
    } else {
      workingDaysCount++;
    }
  }

  return {
    totalDays: lastDay,
    workingDaysCount,
    offDaysCount,
  };
}

/**
 * Deterministic unique task ID generator according to requirement:
 * userId + templateId + scheduledDate (plus preferred time when applicable).
 * Ensures global uniqueness across all users and perfect idempotency.
 */
export function getRecurringTaskId(
  userId: string | undefined | null,
  templateId: string,
  dateISO: string,
  preferredTime?: string
): string {
  const safeUid = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '') : 'local';
  const safeTmpl = templateId.replace(/[^a-zA-Z0-9_-]/g, '');
  const timePart = preferredTime ? `_${preferredTime.replace(':', '')}` : '';
  return `task_${safeUid}_${safeTmpl}_${dateISO}${timePart}`;
}

export type DayActionability = 'past' | 'today' | 'future' | 'off_day';

/**
 * Evaluates the actionability of a task based on strict daily lock rules:
 * - PAST: Read-only
 * - TODAY: Actionable (can be completed, started, edited)
 * - FUTURE: Visible but Locked (cannot be completed early)
 * - OFF DAY: Zero tasks / not actionable
 */
export function getTaskActionability(
  taskDate: string,
  todayISO: string = getTodayISO(),
  isOffDay: boolean = false
): DayActionability {
  if (isOffDay) return 'off_day';
  if (taskDate === todayISO) return 'today';
  if (taskDate > todayISO) return 'future';
  return 'past';
}

/**
 * Returns user-facing lock label for future or past tasks
 */
export function getTaskLockLabel(taskDate: string, todayISO: string = getTodayISO()): string {
  if (taskDate === todayISO) return 'Actionable today';
  if (taskDate > todayISO) {
    const d = parseISODate(taskDate);
    const dayName = DAY_NAMES[d.getDay()];
    const shortDate = formatShortDate(taskDate);
    return `Locked until ${dayName} (${shortDate})`;
  }
  return 'Past task (Read-only)';
}

