import { RequestHandler } from 'express';
import { ZodTypeAny } from 'zod';

// Zod sxemasi bilan body / query / params ni tekshiradi.
// Muvaffaqiyatli bo'lsa, tozalangan (type-coerce qilingan) qiymat qayta yoziladi.
export const validate =
  (schema: ZodTypeAny, source: 'body' | 'query' | 'params' = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);
    (req as any)[source] = result.data;
    next();
  };
