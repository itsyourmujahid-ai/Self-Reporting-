import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from './db';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  token?: string;
}

export function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function logActivity(userId: string, action: string, details?: string) {
  try {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, action, details || null, timestamp);
  } catch (e) {
    console.error('Failed to log activity:', e);
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No Bearer token provided.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({ error: 'Invalid authentication token.' });
    return;
  }

  try {
    const now = new Date().toISOString();
    const session = db.prepare(`
      SELECT s.token, s.user_id, s.expires_at,
             u.id, u.email, u.display_name, u.role, u.status
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ?
    `).get(token, now) as (AuthUser & { token: string; user_id: string; expires_at: string }) | undefined;

    if (!session) {
      res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
      return;
    }

    if (session.status === 'suspended') {
      res.status(403).json({ error: 'Your account is suspended. Please contact support.' });
      return;
    }

    // Update last activity timestamp
    db.prepare('UPDATE users SET last_activity_at = ? WHERE id = ?').run(now, session.id);

    req.user = {
      id: session.id,
      email: session.email,
      display_name: session.display_name,
      role: session.role,
      status: session.status,
    };
    req.token = token;

    next();
  } catch (e) {
    console.error('requireAuth error:', e);
    res.status(500).json({ error: 'Internal authentication error.' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Super Admin authorization required. Access denied.' });
      return;
    }
    next();
  });
}
