import { Task, TaskTemplate, UserSettings } from '../types';
import {
  addMinutesToTime,
  formatISODate,
  isDateOff,
  parseISODate,
  getTodayISO,
  getRecurringTaskId,
} from '../utils/dateUtils';

export { getRecurringTaskId };

/**
 * Result of synchronizing tasks against active templates
 */
export interface SyncResult {
  synchronizedTasks: Task[];
  newTasksCreated: Task[];
  tasksUpdated: Task[];
  tasksRemoved: Task[];
  oldIdsToCleanup: string[];
}

/**
 * Calculates the last working day of a given month
 */
export function getLastWorkingDayOfMonth(
  year: number,
  monthIndex: number,
  weeklyOffDays: number[],
  customOffDates?: string[]
): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = lastDay; d >= 1; d--) {
    const dateISO = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!isDateOff(dateISO, weeklyOffDays, customOffDates)) {
      return d;
    }
  }
  return lastDay;
}

/**
 * Calculates the first working day of a given month
 */
export function getFirstWorkingDayOfMonth(
  year: number,
  monthIndex: number,
  weeklyOffDays: number[],
  customOffDates?: string[]
): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dateISO = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (!isDateOff(dateISO, weeklyOffDays, customOffDates)) {
      return d;
    }
  }
  return 1;
}

/**
 * Generates expected task instances for a single date according to user templates and settings.
 * STRICT CENTRAL RULE: If date is an OFF DAY, returns [] immediately (ZERO TASKS).
 */
export function generateTemplateTasksForDate(
  dateISO: string,
  templates: TaskTemplate[],
  settings: UserSettings,
  userId?: string
): Task[] {
  // STRICT CENTRAL RULE: OFF DAY = ZERO TASKS!
  if (isDateOff(dateISO, settings.weeklyOffDays, settings.customOffDates)) {
    return [];
  }

  // START FROM TODAY: Do not generate tasks prior to persistent cycle startDate
  if (settings.startDate && dateISO < settings.startDate) {
    return [];
  }

  const [year, month, day] = dateISO.split('-').map(Number);
  const dateObj = parseISODate(dateISO);
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const monthIndex = month - 1;

  // Pre-calculate month working day bounds for monthly recurring tasks
  const lastWorkingDay = getLastWorkingDayOfMonth(year, monthIndex, settings.weeklyOffDays, settings.customOffDates);
  const firstWorkingDay = getFirstWorkingDayOfMonth(year, monthIndex, settings.weeklyOffDays, settings.customOffDates);

  const generated: Task[] = [];
  const activeTemplates = templates.filter(t => t.active !== false);

  for (const tmpl of activeTemplates) {
    // Check template start and end date validity
    if (tmpl.startDate && dateISO < tmpl.startDate) continue;
    if (tmpl.endDate && dateISO > tmpl.endDate) continue;

    let shouldGenerate = false;

    if (tmpl.frequency === 'daily') {
      // Daily tasks run on all non-off days
      shouldGenerate = true;
    } else if (
      tmpl.frequency === 'weekly' ||
      tmpl.frequency === 'multiple_times_per_week' ||
      tmpl.frequency === 'custom'
    ) {
      if (tmpl.daysOfWeek && tmpl.daysOfWeek.includes(dayOfWeek)) {
        shouldGenerate = true;
      }
    } else if (tmpl.frequency === 'monthly') {
      if (tmpl.monthlyRule === 'last_working_day' || tmpl.recurrenceTag === 'monthly_report') {
        if (day === lastWorkingDay) shouldGenerate = true;
      } else if (tmpl.monthlyRule === 'first_working_day') {
        if (day === firstWorkingDay) shouldGenerate = true;
      } else if (tmpl.dayOfMonth === day) {
        shouldGenerate = true;
      }
    }

    if (shouldGenerate) {
      const startTime = tmpl.preferredTime || '09:00';
      const duration = tmpl.estimatedDuration || settings.defaultTaskDuration || 30;
      const endTime = addMinutesToTime(startTime, duration);
      const taskId = getRecurringTaskId(userId, tmpl.id, dateISO, startTime);

      generated.push({
        id: taskId,
        userId: userId || undefined,
        title: tmpl.title,
        type: 'recurring',
        date: dateISO,
        startTime,
        endTime,
        durationMinutes: duration,
        status: 'planned',
        priority: tmpl.priority || settings.defaultPriority || 'medium',
        notes: tmpl.notes || '',
        category: tmpl.category || 'Content',
        project: 'Core Routine',
        templateId: tmpl.id,
        recurrenceTag: tmpl.recurrenceTag || tmpl.id,
        createdAt: `${dateISO}T08:00:00.000Z`,
      });
    }
  }

  return generated;
}

/**
 * Generates expected task instances for all days in a month.
 */
export function generateTemplateTasksForMonth(
  monthISO: string, // YYYY-MM
  templates: TaskTemplate[],
  settings: UserSettings,
  userId?: string
): Task[] {
  const [yearStr, monthStr] = monthISO.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const lastDay = new Date(year, month, 0).getDate();

  const monthTasks: Task[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const dateISO = `${monthISO}-${String(d).padStart(2, '0')}`;
    const dayTasks = generateTemplateTasksForDate(dateISO, templates, settings, userId);
    monthTasks.push(...dayTasks);
  }
  return monthTasks;
}

/**
 * Core Idempotent Scheduling Engine:
 * Compares current task instances against active task templates and settings.
 * - Idempotent: Can be run multiple times with 0 duplicates.
 * - Non-destructive: Completed tasks, in-progress tasks, rescheduled tasks, and custom notes are PRESERVED 100%.
 * - OFF DAY Absolute: Discards uncompleted tasks on configured OFF DAYS (ZERO TASKS).
 * - Dynamic Template Sync: Updates planned future task times/titles if template configuration changed.
 */
export function synchronizeTasksWithTemplates(
  existingTasks: Task[],
  templates: TaskTemplate[],
  settings: UserSettings,
  targetMonths?: string[],
  userId?: string
): SyncResult {
  const todayISO = getTodayISO();
  const currentMonthISO = todayISO.slice(0, 7);

  // Calculate the next month ISO string as part of the forward-planning window
  const [currYear, currMonth] = currentMonthISO.split('-').map(Number);
  const nextMonthDate = new Date(currYear, currMonth, 1);
  const nextMonthISO = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Also include the month after next for seamless forward calendar view
  const nextNextMonthDate = new Date(currYear, currMonth + 1, 1);
  const nextNextMonthISO = `${nextNextMonthDate.getFullYear()}-${String(nextNextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Determine months to synchronize:
  // 1. Current month
  // 2. Next month
  // 3. Month after next
  // 4. Any user-configured months from settings
  // 5. Any explicit target months requested
  const monthsSet = new Set<string>([
    currentMonthISO,
    nextMonthISO,
    nextNextMonthISO,
    ...(settings.configuredMonths || []),
    ...(targetMonths || []),
  ]);

  // Active template lookup
  const activeTemplateMap = new Map<string, TaskTemplate>();
  templates.forEach(t => {
    if (t.active !== false) {
      activeTemplateMap.set(t.id, t);
    }
  });

  // Generate all candidate recurring task instances for the target months
  const candidateTasks: Task[] = [];
  for (const m of monthsSet) {
    const mTasks = generateTemplateTasksForMonth(m, templates, settings, userId);
    candidateTasks.push(...mTasks);
  }

  // Map existing tasks
  // We index existing tasks by:
  // 1. Exact ID
  // 2. Composite key: templateId + date + (startTime || '')
  // 3. Legacy ID fallback: rec-${tmpl.id}-${date} and gen-${tmpl.id}-${date}
  const existingById = new Map<string, Task>();
  const existingByTemplateAndDate = new Map<string, Task>();
  const nonRecurringTasks: Task[] = [];
  const recurringOutsideScope: Task[] = [];
  const tasksRemoved: Task[] = [];

  for (const task of existingTasks) {
    // START FROM TODAY: Exclude any previous tasks before startDate from active scope
    if (settings.startDate && task.date < settings.startDate) {
      tasksRemoved.push(task);
      continue;
    }

    const isRecurring = task.type === 'recurring' && Boolean(task.templateId);
    const taskMonth = task.date ? task.date.slice(0, 7) : '';

    if (!isRecurring) {
      // Non-recurring user tasks (one-time, follow-up, meeting, custom): preserve always
      // If task falls on an off-day and is uncompleted, discard if off-days changed
      if (!isDateOff(task.date, settings.weeklyOffDays, settings.customOffDates) || task.status === 'completed') {
        nonRecurringTasks.push(task);
      }
    } else if (!monthsSet.has(taskMonth)) {
      // Recurring tasks outside the active sync window: preserve
      recurringOutsideScope.push(task);
    } else {
      // Check OFF DAY rule: if task falls on an off day
      const isOff = isDateOff(task.date, settings.weeklyOffDays, settings.customOffDates);
      if (isOff) {
        // STRICT RULE: OFF DAY = ZERO TASKS!
        // Uncompleted tasks on OFF DAYS are discarded
        if (task.status === 'completed') {
          // Preserve completed task for historical audit
          nonRecurringTasks.push(task);
        }
        continue;
      }

      existingById.set(task.id, task);
      if (task.templateId && task.date) {
        const timeKey = task.startTime ? `_${task.startTime.replace(':', '')}` : '';
        const compositeKey = `${task.templateId}_${task.date}${timeKey}`;
        existingByTemplateAndDate.set(compositeKey, task);
        // Also index without timeKey as fallback
        if (!existingByTemplateAndDate.has(`${task.templateId}_${task.date}`)) {
          existingByTemplateAndDate.set(`${task.templateId}_${task.date}`, task);
        }
      }
    }
  }

  const synchronizedRecurringTasks: Task[] = [];
  const newTasksCreated: Task[] = [];
  const tasksUpdated: Task[] = [];
  const oldIdsToCleanup: string[] = [];

  const matchedExistingIds = new Set<string>();

  // Reconcile candidate tasks against existing tasks
  for (const candidate of candidateTasks) {
    const timeKey = candidate.startTime ? `_${candidate.startTime.replace(':', '')}` : '';
    const compositeKey = `${candidate.templateId}_${candidate.date}${timeKey}`;
    const generalKey = `${candidate.templateId}_${candidate.date}`;

    // Find if task already exists:
    // 1. By exact candidate ID
    // 2. By compositeKey (templateId + date + time)
    // 3. By generalKey (templateId + date)
    // 4. By legacy format: rec-${tmpl.id}-${date} or gen-${tmpl.id}-${date}
    let existing =
      existingById.get(candidate.id) ||
      existingByTemplateAndDate.get(compositeKey) ||
      existingByTemplateAndDate.get(generalKey) ||
      existingById.get(`rec-${candidate.templateId}-${candidate.date}`) ||
      existingById.get(`gen-${candidate.templateId}-${candidate.date}`);

    if (!existing) {
      // Missing instance: Generate it!
      newTasksCreated.push(candidate);
      synchronizedRecurringTasks.push(candidate);
    } else {
      matchedExistingIds.add(existing.id);

      // Check if ID migration is needed to match the canonical unique format
      const isIdMigrated = existing.id !== candidate.id;
      if (isIdMigrated) {
        oldIdsToCleanup.push(existing.id);
      }

      // If user interacted with the task (completed, in-progress, skipped, rescheduled, or notes added)
      if (existing.status !== 'planned' || existing.notes !== (candidate.notes || '')) {
        // PRESERVE USER STATE 100%!
        const preserved: Task = {
          ...existing,
          id: candidate.id, // Migrate to canonical ID
          userId: userId || existing.userId || undefined,
        };
        synchronizedRecurringTasks.push(preserved);
        if (isIdMigrated) {
          tasksUpdated.push(preserved);
        }
      } else {
        // Still planned: Check if template definition changed
        const template = activeTemplateMap.get(candidate.templateId || '');
        if (template) {
          const hasTimeChanged = existing.startTime !== template.preferredTime;
          const hasDurationChanged = existing.durationMinutes !== template.estimatedDuration;
          const hasTitleChanged = existing.title !== template.title;
          const hasPriorityChanged = existing.priority !== template.priority;
          const hasCategoryChanged = existing.category !== template.category;

          if (hasTimeChanged || hasDurationChanged || hasTitleChanged || hasPriorityChanged || hasCategoryChanged || isIdMigrated) {
            const updatedStartTime = template.preferredTime || existing.startTime || '09:00';
            const updatedDuration = template.estimatedDuration || existing.durationMinutes || 30;
            const updatedEndTime = addMinutesToTime(updatedStartTime, updatedDuration);

            const updatedInstance: Task = {
              ...existing,
              id: candidate.id,
              userId: userId || existing.userId || undefined,
              title: template.title,
              startTime: updatedStartTime,
              endTime: updatedEndTime,
              durationMinutes: updatedDuration,
              priority: template.priority || existing.priority,
              category: template.category || existing.category,
              notes: existing.notes || template.notes || '',
            };
            tasksUpdated.push(updatedInstance);
            synchronizedRecurringTasks.push(updatedInstance);
          } else {
            synchronizedRecurringTasks.push(existing);
          }
        } else {
          // Template inactive or deleted: If future/today, remove; if past, keep
          if (existing.date >= todayISO) {
            tasksRemoved.push(existing);
          } else {
            synchronizedRecurringTasks.push(existing);
          }
        }
      }
    }
  }

  // Any existing tasks in scope that were NOT matched:
  // e.g. from an inactive/deleted template or changed day of week
  for (const [id, existing] of existingById.entries()) {
    if (!matchedExistingIds.has(id)) {
      if (existing.status !== 'planned') {
        // User interacted with it: keep it!
        synchronizedRecurringTasks.push(existing);
      } else if (existing.date < todayISO) {
        // In the past: keep it!
        synchronizedRecurringTasks.push(existing);
      } else {
        // Future uncompleted task whose template is no longer active: remove
        tasksRemoved.push(existing);
      }
    }
  }

  // Combine non-recurring + outside scope + synchronized recurring
  const allSynchronized = [
    ...nonRecurringTasks,
    ...recurringOutsideScope,
    ...synchronizedRecurringTasks,
  ];

  // Remove any duplicates by id just in case
  const uniqueTasksMap = new Map<string, Task>();
  allSynchronized.forEach(t => {
    uniqueTasksMap.set(t.id, t);
  });

  const finalTasks = Array.from(uniqueTasksMap.values());

  // Sort chronologically by date ascending, then startTime ascending
  finalTasks.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (a.startTime || '00:00').localeCompare(b.startTime || '00:00');
  });

  return {
    synchronizedTasks: finalTasks,
    newTasksCreated,
    tasksUpdated,
    tasksRemoved,
    oldIdsToCleanup,
  };
}
