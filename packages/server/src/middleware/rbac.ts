import { Request, Response, NextFunction } from 'express';
import { isDevUser, isSuperAdminUser } from '../utils/allowedGuilds';

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  const hasPerm = await isSuperAdminUser(user.id);
  if (!hasPerm) {
    return res.status(403).json({ error: 'Forbidden: Super Admin privileges required to perform this action' });
  }

  return next();
}

export function requireDev(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  if (!isDevUser(user.id)) {
    return res.status(403).json({ error: 'Forbidden: Root Developer (Dev) privileges required to perform this action' });
  }

  return next();
}

