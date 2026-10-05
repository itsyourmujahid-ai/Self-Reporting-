import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db } from './db.ts';
import { adminAuth } from '../src/lib/firebase-admin.ts';
import { getOrCreateUser } from '../src/db/repository.ts';

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

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
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

  // 1. Try Firebase Admin ID Token verification first (Primary)
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email || '';
    const displayName = (decodedToken.name as string) || email.split('@')[0] || 'User';
    const isAdmin = email === 'admin@zaynhub.com' || email === 'itsyourmujahid@gmail.com';
    const role: 'user' | 'admin' = isAdmin ? 'admin' : 'user';

    // Synchronize user in PostgreSQL
    const dbUser = await getOrCreateUser(decodedToken.uid, email, displayName, role);

    if (dbUser.status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      display_name: dbUser.displayName,
      role: dbUser.role as 'user' | 'admin',
      status: dbUser.status as 'active' | 'suspended',
    };
    req.token = token;
    next();
    return;
  } catch (_firebaseErr) {
    // Fall through to check local session
  }

  // 2. Fallback to local session check
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
