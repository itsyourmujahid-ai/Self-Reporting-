import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { db } from '../db';
import { hashPassword, generateToken, logActivity, requireAuth, AuthenticatedRequest } from '../auth';

export const authRouter = Router();

// Standard templates & settings defaults for clean initialization
const DEFAULT_INITIAL_SETTINGS = {
  userName: 'Personal Workspace',
  weeklyOffDays: [5, 6], // Friday & Saturday off
  workingDays: [0, 1, 2, 3, 4], // Sun, Mon, Tue, Wed, Thu
  workDayStart: '09:00',
  workDayEnd: '18:00',
  defaultTaskDuration: 30,
  defaultPriority: 'medium',
  categories: ['Content', 'Operations', 'Sales', 'Meetings', 'Follow-up', 'Planning'],
  projects: ['Core Routine', 'Lead Generation', 'Personal Brand', 'Client Relations'],
  configuredMonths: ['2026-10'],
};

const DEFAULT_INITIAL_TEMPLATES = [
  {
    id: 'tmpl-daily-poster',
    title: 'Create Status Poster',
    type: 'recurring',
    frequency: 'daily',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
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
    preferredTime: '15:00',
    estimatedDuration: 60,
    category: 'Sales',
    priority: 'high',
    active: true,
    notes: 'Conduct 20 targeted direct outbound discovery calls.',
    recurrenceTag: 'cold_calls',
  },
];

authRouter.post('/register', (req, res): void => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'A valid email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const name = displayName?.trim() || trimmedEmail.split('@')[0];

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }

    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const now = new Date().toISOString();

    // Auto-promote known administrative emails
    const role = (trimmedEmail === 'admin@zaynhub.com' || trimmedEmail === 'itsyourmujahid@gmail.com') ? 'admin' : 'user';

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, display_name, role, created_at, last_activity_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(userId, trimmedEmail, passwordHash, salt, name, role, now, now);

    // Initialize clean workspace settings and templates (NO DEMO TASKS, NO DEMO REPORTS!)
    const initialSettings = { ...DEFAULT_INITIAL_SETTINGS, userName: name };
    db.prepare(`
      INSERT INTO user_settings (user_id, settings_json, updated_at)
      VALUES (?, ?, ?)
    `).run(userId, JSON.stringify(initialSettings), now);

    db.prepare(`
      INSERT INTO user_templates (user_id, templates_json, updated_at)
      VALUES (?, ?, ?)
    `).run(userId, JSON.stringify(DEFAULT_INITIAL_TEMPLATES), now);

    // Create session token (30 days validity)
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, userId, now, expiresAt);

    logActivity(userId, 'signup', `New ${role} account created for ${trimmedEmail}`);

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        email: trimmedEmail,
        displayName: name,
        role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

authRouter.post('/login', (req, res): void => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = db.prepare(`
      SELECT id, email, password_hash, salt, display_name, role, status
      FROM users
      WHERE email = ?
    `).get(trimmedEmail) as {
      id: string;
      email: string;
      password_hash: string;
      salt: string;
      display_name: string;
      role: 'user' | 'admin';
      status: 'active' | 'suspended';
    } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.password_hash) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const now = new Date().toISOString();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare('UPDATE users SET last_activity_at = ? WHERE id = ?').run(now, user.id);

    db.prepare(`
      INSERT INTO sessions (token, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, user.id, now, expiresAt);

    logActivity(user.id, 'login', `User logged in from ${trimmedEmail}`);

    res.json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to log in. Please try again.' });
  }
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      displayName: req.user.display_name,
      role: req.user.role,
    },
  });
});

authRouter.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  try {
    if (req.token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    }
    if (req.user) {
      logActivity(req.user.id, 'logout', 'User logged out');
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (e) {
    console.error('Logout error:', e);
    res.status(500).json({ error: 'Logout failed.' });
  }
});
