import { TaskTemplate, UserSettings, Task, WeeklyReportRecord, MonthlyReportRecord } from '../types';
import { addMinutesToTime, formatISODate, getWeekIdentifier, getWeekRange } from './dateUtils';

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
    daysOfWeek: [0, 1, 2, 3, 4], // Working days (Sun-Thu)
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
    daysOfWeek: [0, 1, 2, 3, 4],
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
    daysOfWeek: [0, 1, 2, 3, 4],
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
    daysOfWeek: [0, 1, 2, 3, 4],
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
];

/**
 * Generate initial seeded tasks for September 2026
 * Given today is 2026-09-29 (Tuesday)
 */
export function generateInitialTasks(): Task[] {
  const tasks: Task[] = [];
  const year = 2026;
  const month = 8; // September (0-indexed)
  const totalDays = 30;
  const weeklyOffDays = [5, 6]; // Friday & Saturday

  // Recurring templates
  for (let day = 1; day <= totalDays; day++) {
    const dateObj = new Date(year, month, day);
    const dateISO = formatISODate(dateObj);
    const dayOfWeek = dateObj.getDay();
    const isOffDay = weeklyOffDays.includes(dayOfWeek);

    // Skip recurring on off days unless intentionally scheduled
    if (!isOffDay) {
      // Daily routines
      // 09:00 Create Status Poster
      const isPast = day < 29;
      const isToday = day === 29;

      tasks.push({
        id: `task-poster-${dateISO}`,
        title: 'Create Status Poster',
        type: 'recurring',
        date: dateISO,
        startTime: '09:00',
        endTime: '09:30',
        durationMinutes: 30,
        status: isPast ? 'completed' : isToday ? 'completed' : 'planned',
        priority: 'high',
        notes: 'Daily status poster design & publishing across announcement channels.',
        category: 'Content',
        project: 'Core Routine',
        createdAt: '2026-09-01T08:00:00Z',
        completedAt: isPast || isToday ? `${dateISO}T09:28:00Z` : undefined,
        recurrenceTag: 'daily_poster',
        templateId: 'tmpl-daily-poster',
      });

      // 10:00 Delivery Report
      tasks.push({
        id: `task-delivery-${dateISO}`,
        title: 'Delivery Report',
        type: 'recurring',
        date: dateISO,
        startTime: '10:00',
        endTime: '10:45',
        durationMinutes: 45,
        status: isPast ? 'completed' : isToday ? 'completed' : 'planned',
        priority: 'high',
        notes: 'Warehouse dispatch log audit and transit tracking reconciliation.',
        category: 'Operations',
        project: 'Core Routine',
        createdAt: '2026-09-01T08:00:00Z',
        completedAt: isPast || isToday ? `${dateISO}T10:42:00Z` : undefined,
        recurrenceTag: 'delivery_report',
        templateId: 'tmpl-delivery-report',
      });

      // 11:00 Seller Updates
      tasks.push({
        id: `task-seller-${dateISO}`,
        title: 'Seller Updates',
        type: 'recurring',
        date: dateISO,
        startTime: '11:00',
        endTime: '12:00',
        durationMinutes: 60,
        status: isPast ? (day % 7 === 0 ? 'skipped' : 'completed') : isToday ? 'in_progress' : 'planned',
        priority: 'medium',
        notes: 'Batch message merchants on order volume quotas and restock forecasts.',
        category: 'Operations',
        project: 'Core Routine',
        createdAt: '2026-09-01T08:00:00Z',
        completedAt: isPast && day % 7 !== 0 ? `${dateISO}T11:55:00Z` : undefined,
        recurrenceTag: 'seller_updates',
        templateId: 'tmpl-seller-updates',
      });

      // 15:00 Cold Calls
      tasks.push({
        id: `task-coldcalls-${dateISO}`,
        title: 'Cold Calls Outreach',
        type: 'recurring',
        date: dateISO,
        startTime: '15:00',
        endTime: '16:00',
        durationMinutes: 60,
        status: isPast ? 'completed' : 'planned',
        priority: 'high',
        notes: 'Targeted outbound calls to potential commercial partners.',
        category: 'Sales',
        project: 'Lead Generation',
        createdAt: '2026-09-01T08:00:00Z',
        completedAt: isPast ? `${dateISO}T16:05:00Z` : undefined,
        recurrenceTag: 'cold_calls',
        templateId: 'tmpl-cold-calls',
      });

      // Weekly tasks according to daysOfWeek
      // Instagram Carousel on Monday (1)
      if (dayOfWeek === 1) {
        tasks.push({
          id: `task-ig-${dateISO}`,
          title: 'Instagram Carousel',
          type: 'recurring',
          date: dateISO,
          startTime: '13:00',
          endTime: '13:45',
          durationMinutes: 45,
          status: isPast ? 'completed' : 'planned',
          priority: 'medium',
          notes: 'Publish carousel on business automation tactics with step-by-step visuals.',
          category: 'Content',
          project: 'Personal Brand',
          createdAt: '2026-09-01T08:00:00Z',
          completedAt: isPast ? `${dateISO}T13:40:00Z` : undefined,
          recurrenceTag: 'ig_carousel',
          templateId: 'tmpl-ig-carousel',
        });
      }

      // Reel on Thursday (4)
      if (dayOfWeek === 4) {
        tasks.push({
          id: `task-reel-${dateISO}`,
          title: 'Weekly Reel Video',
          type: 'recurring',
          date: dateISO,
          startTime: '14:00',
          endTime: '14:45',
          durationMinutes: 45,
          status: isPast ? 'completed' : 'planned',
          priority: 'medium',
          notes: 'Short-form workflow breakdown with audio hook.',
          category: 'Content',
          project: 'Personal Brand',
          createdAt: '2026-09-01T08:00:00Z',
          completedAt: isPast ? `${dateISO}T14:50:00Z` : undefined,
          recurrenceTag: 'weekly_reel',
          templateId: 'tmpl-reel',
        });
      }

      // LinkedIn Posts (Sun 0, Mon 1, Wed 3)
      if ([0, 1, 3].includes(dayOfWeek)) {
        tasks.push({
          id: `task-li-${dateISO}`,
          title: 'LinkedIn Post',
          type: 'recurring',
          date: dateISO,
          startTime: '10:30',
          endTime: '11:00',
          durationMinutes: 30,
          status: isPast ? 'completed' : isToday ? 'planned' : 'planned',
          priority: 'medium',
          notes: 'Publish insight on optimizing vendor supply chains and self-reporting routines.',
          category: 'Content',
          project: 'Personal Brand',
          createdAt: '2026-09-01T08:00:00Z',
          completedAt: isPast ? `${dateISO}T10:55:00Z` : undefined,
          recurrenceTag: 'linkedin_post',
          templateId: 'tmpl-linkedin',
        });
      }

      // X Posts (Sun 0, Tue 2, Thu 4)
      if ([0, 2, 4].includes(dayOfWeek)) {
        tasks.push({
          id: `task-x-${dateISO}`,
          title: 'X Thread / Update',
          type: 'recurring',
          date: dateISO,
          startTime: '16:30',
          endTime: '16:50',
          durationMinutes: 20,
          status: isPast ? 'completed' : isToday ? 'planned' : 'planned',
          priority: 'low',
          notes: 'Punchy thread highlighting operational efficiency rules.',
          category: 'Content',
          project: 'Personal Brand',
          createdAt: '2026-09-01T08:00:00Z',
          completedAt: isPast ? `${dateISO}T16:48:00Z` : undefined,
          recurrenceTag: 'x_post',
          templateId: 'tmpl-x-post',
        });
      }

      // Website Blog on Wednesday (3)
      if (dayOfWeek === 3) {
        tasks.push({
          id: `task-blog-${dateISO}`,
          title: 'Website Blog Article',
          type: 'recurring',
          date: dateISO,
          startTime: '16:00',
          endTime: '17:00',
          durationMinutes: 60,
          status: isPast ? 'completed' : 'planned',
          priority: 'medium',
          notes: 'In-depth essay on building a resilient personal operating system.',
          category: 'Content',
          project: 'Personal Brand',
          createdAt: '2026-09-01T08:00:00Z',
          completedAt: isPast ? `${dateISO}T17:15:00Z` : undefined,
          recurrenceTag: 'blog_post',
          templateId: 'tmpl-blog-post',
        });
      }
    }
  }

  // Add specialized Meetings and Follow-ups
  // Today's Follow-up: 17:00 Follow-up — ABC Company (as in prompt example!)
  tasks.push({
    id: 'task-followup-abc',
    title: 'Follow-up — ABC Company',
    type: 'follow_up',
    date: '2026-09-29',
    startTime: '17:00',
    endTime: '17:30',
    durationMinutes: 30,
    status: 'planned',
    priority: 'high',
    notes: 'Ask about quotation and logistics requirements from previous discovery call.',
    category: 'Follow-up',
    project: 'Lead Generation',
    contactName: 'ABC Company (Sarah Jenkins)',
    createdAt: '2026-09-22T10:00:00Z',
    isImportant: true,
  });

  // Tomorrow's Meeting (Wednesday Sep 30)
  tasks.push({
    id: 'task-meeting-horizon',
    title: 'Quarterly Review with Horizon Supplies',
    type: 'meeting',
    date: '2026-09-30',
    startTime: '14:00',
    endTime: '15:00',
    durationMinutes: 60,
    status: 'planned',
    priority: 'urgent',
    notes: 'Review Q3 delivery volumes and contract renewal terms.',
    category: 'Meetings',
    project: 'Client Relations',
    meetingWith: 'Marcus Vance (Horizon Supplies)',
    locationOrLink: 'Video Call (Room 4)',
    createdAt: '2026-09-20T11:00:00Z',
    isImportant: true,
  });

  // Tomorrow's Follow-up (Wednesday Sep 30)
  tasks.push({
    id: 'task-followup-vertex',
    title: 'Follow-up — Vertex Logistics',
    type: 'follow_up',
    date: '2026-09-30',
    startTime: '11:30',
    endTime: '12:00',
    durationMinutes: 30,
    status: 'planned',
    priority: 'medium',
    notes: 'Check if SLA revision proposal was approved by management.',
    category: 'Follow-up',
    project: 'Lead Generation',
    contactName: 'Vertex Logistics',
    createdAt: '2026-09-24T14:00:00Z',
  });

  // Past completed meeting on Sep 22
  tasks.push({
    id: 'task-meeting-apex',
    title: 'Strategy Session with Apex Retailers',
    type: 'meeting',
    date: '2026-09-22',
    startTime: '14:00',
    endTime: '15:00',
    durationMinutes: 60,
    status: 'completed',
    priority: 'high',
    notes: 'Discussed onboarding 15 new sellers in October.',
    outcomeNotes: 'Client agreed to test batch onboarding starting Oct 5th. Scheduled quotation follow-up.',
    category: 'Meetings',
    project: 'Client Relations',
    meetingWith: 'David Miller (Apex Retailers)',
    createdAt: '2026-09-15T09:00:00Z',
    completedAt: '2026-09-22T15:10:00Z',
  });

  // Past completed follow-up on Sep 23
  tasks.push({
    id: 'task-followup-miller',
    title: 'Follow-up — Apex Retailers Contract Draft',
    type: 'follow_up',
    date: '2026-09-23',
    startTime: '11:30',
    endTime: '12:00',
    durationMinutes: 30,
    status: 'completed',
    priority: 'high',
    notes: 'Confirm draft terms sent to their legal department.',
    category: 'Follow-up',
    project: 'Client Relations',
    contactName: 'Apex Retailers',
    createdAt: '2026-09-22T15:15:00Z',
    completedAt: '2026-09-23T11:45:00Z',
  });

  return tasks;
}

export const INITIAL_WEEKLY_REPORTS: WeeklyReportRecord[] = [
  {
    id: 'report-w38',
    weekIdentifier: '2026-W38',
    startDate: '2026-09-13',
    endDate: '2026-09-19',
    savedAt: '2026-09-19T18:30:00Z',
    reflection: {
      accomplishments: 'Maintained 100% daily status posters and delivery audits. Completed all 3 LinkedIn articles on schedule.',
      wentWell: 'Cold call outreach batching at 15:00 resulted in 4 qualified conversations.',
      failedOrDelayed: 'Delayed Thursday reel publication by one day due to video rendering setup.',
      causesOfDelays: 'Had unexpected logistics emergency on seller return shipments.',
      nextWeekFocus: 'Prepare client quotation drafts earlier in the morning block.',
    },
  },
];

export const INITIAL_MONTHLY_REPORTS: MonthlyReportRecord[] = [
  {
    id: 'report-m08',
    monthIdentifier: '2026-08',
    savedAt: '2026-08-31T19:00:00Z',
    reflection: {
      majorAccomplishments: 'Generated 22 daily delivery audits, 12 LinkedIn articles, and completed 4 crucial client partner reviews.',
      problems: 'Felt mid-day fatigue on days with back-to-back seller troubleshooting.',
      missedGoals: 'Missed 2 X threads during week 3 travel.',
      lessonsLearned: 'Strict time blocking for cold calls at 15:00 prevents afternoon procrastination.',
      nextMonthPriorities: 'Scale up seller onboarding pipeline and finalize Q4 content editorial calendar.',
    },
  },
];
