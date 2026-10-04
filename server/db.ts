import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve('data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'self_reporting.db');
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for high concurrency and performance
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
} catch (e) {
  console.warn('Note: PRAGMA journal_mode warning:', e);
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'user' | 'admin'
      created_at TEXT NOT NULL,
      last_activity_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' -- 'active' | 'suspended'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      settings_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_templates (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      templates_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      type TEXT NOT NULL,
      start_time TEXT,
      end_time TEXT,
      duration_minutes INTEGER,
      category TEXT,
      project TEXT,
      notes TEXT,
      recurrence_tag TEXT,
      template_id TEXT,
      actual_minutes INTEGER,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL, -- 'weekly' | 'monthly'
      period_key TEXT NOT NULL,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (id, user_id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_logs(timestamp);
  `);

  seedSuperAdmin();
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function seedSuperAdmin() {
  // Check if admin already exists
  const existingAdmin = db.prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1").get();

  if (!existingAdmin) {
    const adminId = crypto.randomUUID();
    const email = 'admin@zaynhub.com';
    const salt = crypto.randomBytes(16).toString('hex');
    const adminInitialSecret = process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(32).toString('hex');
    const passwordHash = hashPassword(adminInitialSecret, salt);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, display_name, role, created_at, last_activity_at, status)
      VALUES (?, ?, ?, ?, ?, 'admin', ?, ?, 'active')
    `).run(adminId, email, passwordHash, salt, 'Super Admin', now, now);

    console.log('✓ Initial Super Admin provisioned: admin@zaynhub.com');

    // Also register the owner email from metadata if provided
    const ownerEmail = 'itsyourmujahid@gmail.com';
    const existingOwner = db.prepare("SELECT * FROM users WHERE email = ?").get(ownerEmail);
    if (!existingOwner) {
      const ownerId = crypto.randomUUID();
      const ownerSalt = crypto.randomBytes(16).toString('hex');
      const ownerInitialSecret = process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(32).toString('hex');
      const ownerHash = hashPassword(ownerInitialSecret, ownerSalt);
      db.prepare(`
        INSERT INTO users (id, email, password_hash, salt, display_name, role, created_at, last_activity_at, status)
        VALUES (?, ?, ?, ?, ?, 'admin', ?, ?, 'active')
      `).run(ownerId, ownerEmail, ownerHash, ownerSalt, 'Mujahid (Owner)', now, now);
      console.log(`✓ Owner Super Admin provisioned: ${ownerEmail}`);
    }
  }
}
