import { NextFunction, Request, RequestHandler, Response } from 'express';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Async controller xatolarini markaziy errorHandler'ga uzatadi
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

// Yagona javob formati: { success, data, message }
export function ok(res: Response, data: unknown = null, message = 'Muvaffaqiyatli', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function paged<T>(items: T[], total: number, page: number, limit: number) {
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export interface ListQuery {
  page: number;
  limit: number;
  search: string;
}
