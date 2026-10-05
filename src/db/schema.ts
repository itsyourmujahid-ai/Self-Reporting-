import { pgTable, text, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users Table (keyed by Firebase Auth UID)
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  status: text('status').notNull().default('active'), // 'active' | 'suspended'
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at', { mode: 'string' }).defaultNow().notNull(),
});

// 2. User Settings Table
export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  settingsJson: text('settings_json').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

// 3. User Templates Table
export const userTemplates = pgTable('user_templates', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  templatesJson: text('templates_json').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
});

// 4. Tasks Table
export const tasks = pgTable(
  'tasks',
  {
    id: text('id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    date: text('date').notNull(),
    status: text('status').notNull().default('planned'),
    priority: text('priority').notNull().default('medium'),
    type: text('type').notNull().default('task'),
    startTime: text('start_time'),
    endTime: text('end_time'),
    durationMinutes: integer('duration_minutes').default(30),
    category: text('category'),
    project: text('project'),
    notes: text('notes'),
    recurrenceTag: text('recurrence_tag'),
    templateId: text('template_id'),
    actualMinutes: integer('actual_minutes'),
    completedAt: text('completed_at'),
    contactName: text('contact_name'),
    nextFollowUpDate: text('next_follow_up_date'),
    parentTaskId: text('parent_task_id'),
    meetingWith: text('meeting_with'),
    locationOrLink: text('location_or_link'),
    outcomeNotes: text('outcome_notes'),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.userId] }),
  ]
);

// 5. Reports Table
export const reports = pgTable(
  'reports',
  {
    id: text('id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'weekly' | 'monthly'
    periodKey: text('period_key').notNull(),
    reportJson: text('report_json').notNull(),
    createdAt: timestamp('created_at', { mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.userId] }),
  ]
);

// 6. Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  details: text('details'),
  timestamp: timestamp('timestamp', { mode: 'string' }).defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  templates: one(userTemplates, {
    fields: [users.id],
    references: [userTemplates.userId],
  }),
  tasks: many(tasks),
  reports: many(reports),
  activityLogs: many(activityLogs),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
}));
