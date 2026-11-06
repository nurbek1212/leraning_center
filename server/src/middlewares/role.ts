import { RequestHandler } from 'express';
import type { Role } from '../types/express';
import { ApiError } from '../utils/http';

// Faqat berilgan rollarga ruxsat beradi
export const allowRoles =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Bu amal uchun ruxsatingiz yo'q"));
    }
    next();
  };
