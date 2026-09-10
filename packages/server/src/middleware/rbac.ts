import { Request, Response, NextFunction } from 'express';

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
  }

  if (user.isSuperAdmin !== true) {
    return res.status(403).json({ error: 'Forbidden: Super Admin privileges required to perform this action' });
  }

  return next();
}
