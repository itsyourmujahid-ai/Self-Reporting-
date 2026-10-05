import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/repository.ts';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string;
    role: 'user' | 'admin';
    status: 'active' | 'suspended';
  };
  token?: string;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Empty token' });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = decodedToken.email || '';
    const displayName = (decodedToken.name as string) || email.split('@')[0] || 'User';
    const isAdmin = email === 'admin@zaynhub.com' || email === 'itsyourmujahid@gmail.com';
    const role: 'user' | 'admin' = isAdmin ? 'admin' : 'user';

    let dbUser: any = null;
    try {
      dbUser = await getOrCreateUser(decodedToken.uid, email, displayName, role);
    } catch (dbErr) {
      console.warn('Database user sync warning (continuing with verified Firebase identity):', dbErr);
    }

    if (dbUser && dbUser.status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by an administrator.' });
      return;
    }

    req.user = {
      id: dbUser?.id || decodedToken.uid,
      email: dbUser?.email || email,
      displayName: dbUser?.displayName || displayName,
      role: (dbUser?.role as 'user' | 'admin') || role,
      status: (dbUser?.status as 'active' | 'suspended') || 'active',
    };
    req.token = token;
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  await requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      res.status(403).json({ error: 'Super Admin authorization required. Access denied.' });
      return;
    }
    next();
  });
};
