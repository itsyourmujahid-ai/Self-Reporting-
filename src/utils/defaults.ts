import { TaskTemplate, UserSettings, Task, WeeklyReportRecord, MonthlyReportRecord } from '../types';
import { addMinutesToTime, formatISODate, getWeekIdentifier, getWeekRange, isDateOff, parseISODate } from './dateUtils';

export const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Personal Workspace',
  weeklyOffDays: [5, 6], // Friday (5) and Saturday (6) as requested
  workingDays: [0, 1, 2, 3, 4], // Sun, Mon, Tue, Wed, Thu
  workDayStart: '09:00',
  workDayEnd: '18:00',
  defaultTaskDuration: 30,
  defaultPriority: 'medium',
  categories: ['Content', 'Operations', 'Sales', 'Meetings', 'Follow-up', 'Planning'],
  projects: ['Core Routine', 'Lead Generation', 'Personal Brand', 'Client Relations'],
  configuredMonths: ['2026-09'],
};

export const DEFAULT_TEMPLATES: TaskTemplate[] = [
  // Daily tasks
  {
    id: 'tmpl-daily-poster',
    title: 'Create Status Poster',
    type: 'recurring',
    frequency: 'daily',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Every day
    generateOnlyOnWorkingDays: false,
    preferredTime: '09:00',
    estimatedDuration: 30,
    category: 'Content',
    priority: 'high',
    active: true,
    notes: 'Design daily social status visual and announcement copy.',
    recurrenceTag: 'daily_poster',
  },
  {
    id: 'tmpl-delivery-report',
    title: 'Delivery Report',
    type: 'recurring',
    frequency: 'daily',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    generateOnlyOnWorkingDays: false,
    preferredTime: '10:00',
    estimatedDuration: 45,
    category: 'Operations',
    priority: 'high',
    active: true,
    notes: 'Verify order dispatches, shipment tracking, and logistics exceptions.',
    recurrenceTag: 'delivery_report',
  },
  {
    id: 'tmpl-seller-updates',
    title: 'Seller Updates',
    type: 'recurring',
    frequency: 'daily',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    generateOnlyOnWorkingDays: false,
    preferredTime: '11:00',
    estimatedDuration: 60,
    category: 'Operations',
    priority: 'medium',
    active: true,
    notes: 'Send inventory, pricing adjustments, and vendor performance updates.',
    recurrenceTag: 'seller_updates',
  },
  {
    id: 'tmpl-cold-calls',
    title: 'Cold Calls Outreach',
    type: 'recurring',
    frequency: 'daily',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    generateOnlyOnWorkingDays: false,
    preferredTime: '15:00',
    estimatedDuration: 60,
    category: 'Sales',
    priority: 'high',
    active: true,
    notes: 'Conduct 20 targeted direct outbound discovery calls.',
    recurrenceTag: 'cold_calls',
  },

  // Weekly tasks
  {
    id: 'tmpl-ig-carousel',
    title: 'Instagram Carousel',
    type: 'recurring',
    frequency: 'weekly',
    daysOfWeek: [1], // Monday
    timesPerWeek: 1,
    preferredTime: '13:00',
    estimatedDuration: 45,
    category: 'Content',
    priority: 'medium',
    active: true,
    notes: '5-slide educational carousel breakdown with actionable takeaway.',
    recurrenceTag: 'ig_carousel',
  },
  {
    id: 'tmpl-reel',
    title: 'Weekly Reel Video',
    type: 'recurring',
    frequency: 'weekly',
    daysOfWeek: [4], // Thursday
    timesPerWeek: 1,
    preferredTime: '14:00',
    estimatedDuration: 45,
    category: 'Content',
    priority: 'medium',
    active: true,
    notes: 'Record and edit 45-second high-yield tip video with subtitles.',
    recurrenceTag: 'weekly_reel',
  },
  {
    id: 'tmpl-linkedin',
    title: 'LinkedIn Post',
    type: 'recurring',
    frequency: 'weekly',
    daysOfWeek: [0, 1, 3], // Sunday, Monday, Wednesday (3 times per week)
    timesPerWeek: 3,
    preferredTime: '10:30',
    estimatedDuration: 30,
    category: 'Content',
    priority: 'medium',
    active: true,
    notes: 'Industry insight, case study summary, or workflow breakdown.',
    recurrenceTag: 'linkedin_post',
  },
  {
    id: 'tmpl-x-post',
    title: 'X Thread / Update',
    type: 'recurring',
    frequency: 'weekly',
    daysOfWeek: [0, 2, 4], // Sunday, Tuesday, Thursday (3 times per week)
    timesPerWeek: 3,
    preferredTime: '16:30',
    estimatedDuration: 20,
    category: 'Content',
    priority: 'low',
    active: true,
    notes: 'Punchy insight or curated tactical lesson.',
    recurrenceTag: 'x_post',
  },
  {
    id: 'tmpl-blog-post',
    title: 'Website Blog Article',
    type: 'recurring',
    frequency: 'weekly',
    daysOfWeek: [3], // Wednesday
    timesPerWeek: 1,
    preferredTime: '16:00',
    estimatedDuration: 60,
    category: 'Content',
    priority: 'medium',
    active: true,
    notes: 'Long-form practical guide with diagrams and checklist.',
    recurrenceTag: 'blog_post',
  },
  {
    id: 'tmpl-monthly-report',
    title: 'Monthly Self Report',
    type: 'recurring',
    frequency: 'monthly',
    monthlyRule: 'last_working_day',
    daysOfWeek: [],
    dayOfMonth: 30,
    preferredTime: '16:00',
    estimatedDuration: 60,
    category: 'Planning',
    priority: 'high',
    active: true,
    notes: 'Review monthly accomplishment metrics, log delays, and finalize executive self-report.',
    recurrenceTag: 'monthly_report',
  },
];

/**
 * Dynamically generate recurring tasks for any single day based on active templates and settings
 */
export function generateDayRecurringTasks(
  dateISO: string,
  templates: TaskTemplate[] = DEFAULT_TEMPLATES,
  settings: UserSettings = DEFAULT_SETTINGS
): Task[] {
  // STRICT CENTRAL RULE: OFF DAY = ZERO TASKS!
  // If date is configured as an off day (weekly off day or custom off date), return 0 tasks immediately!
  if (isDateOff(dateISO, settings.weeklyOffDays, settings.customOffDates)) {
    return [];
  }

  const [year, month, day] = dateISO.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay();

  const isWorkingDay = settings.workingDays ? settings.workingDays.includes(dayOfWeek) : true;
  const daysInMonth = new Date(year, month, 0).getDate();

  const generated: Task[] = [];

  templates.filter(t => t.active !== false).forEach(tmpl => {
    let shouldGenerate = false;

    if (tmpl.frequency === 'daily') {
      // Daily tasks run on working days, strictly skipping off days
      shouldGenerate = true;
    } else if (tmpl.frequency === 'weekly' || tmpl.frequency === 'multiple_times_per_week' || tmpl.frequency === 'custom') {
      if (tmpl.daysOfWeek.includes(dayOfWeek)) {
        shouldGenerate = true;
      }
    } else if (tmpl.frequency === 'monthly') {
      if (tmpl.monthlyRule === 'last_working_day') {
        if (day === daysInMonth) shouldGenerate = true;
      } else if (tmpl.dayOfMonth === day) {
        shouldGenerate = true;
      }
    }

    if (shouldGenerate) {
      const endTime = addMinutesToTime(tmpl.preferredTime, tmpl.estimatedDuration);
      generated.push({
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
        project: 'Core Routine',
        templateId: tmpl.id,
        recurrenceTag: tmpl.recurrenceTag,
        createdAt: `${dateISO}T08:00:00Z`,
      });
    }
  });

  return generated;
}

/**
 * Production Initial Setup: Clean workspace for new users with ZERO demo tasks.
 * Users plan their own month and create their own tasks.
 */
export function generateInitialTasks(): Task[] {
  return [];
}

export const INITIAL_WEEKLY_REPORTS: WeeklyReportRecord[] = [];

export const INITIAL_MONTHLY_REPORTS: MonthlyReportRecord[] = [];
