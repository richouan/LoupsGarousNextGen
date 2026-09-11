import { RequestHandler } from 'express';
import { isDevUser, isSuperAdminUser } from '../utils/allowedGuilds';

export const requireSuperAdmin: RequestHandler = async (req, res, next) => {
  const user = (req as any).user;
  
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    return;
  }

  const hasPerm = await isSuperAdminUser(user.id);
  if (!hasPerm) {
    res.status(403).json({ error: 'Forbidden: Super Admin privileges required to perform this action' });
    return;
  }

  next();
};

export const requireDev: RequestHandler = (req, res, next) => {
  const user = (req as any).user;

  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    return;
  }

  if (!isDevUser(user.id)) {
    res.status(403).json({ error: 'Forbidden: Root Developer (Dev) privileges required to perform this action' });
    return;
  }

  next();
};
