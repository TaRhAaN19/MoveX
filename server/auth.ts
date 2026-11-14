import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'movex-hackathon-dev-secret-2026';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: 'sender' | 'partner' | 'admin';
  can_deliver: number;
  verification_status: 'VERIFIED' | 'PENDING' | 'SUSPENDED';
  rating: number;
}

export interface AuthedRequest extends Request {
  user?: AuthUser;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function validatePasswordStrength(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { sub: number };
    const user = db.prepare(
      'SELECT id, name, email, mobile, role, can_deliver, verification_status, rating FROM users WHERE id = ?'
    ).get(decoded.sub) as AuthUser | undefined;

    if (!user) {
      res.status(401).json({ error: 'Account not found.' });
      return;
    }
    if (user.verification_status === 'SUSPENDED') {
      res.status(403).json({ error: 'Account is currently suspended. Contact MOVEX support.' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token. Please log in again.' });
  }
}

export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    next();
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { sub: number };
    const user = db.prepare(
      'SELECT id, name, email, mobile, role, can_deliver, verification_status, rating FROM users WHERE id = ?'
    ).get(decoded.sub) as AuthUser | undefined;
    if (user && user.verification_status !== 'SUSPENDED') {
      req.user = user;
    }
  } catch {
    // ignore invalid optional token
  }
  next();
}

export function requireRole(...roles: Array<'sender' | 'partner' | 'admin'>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied for your account role.' });
      return;
    }
    next();
  };
}
