import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/http';

const fail = (message: string, data: unknown = null) => ({ success: false, data, message });

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json(fail(`Yo'l topilmadi: ${req.method} ${req.originalUrl}`));
};

// Barcha xatoliklar shu yerda yagona formatda qaytariladi
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    const first = details[0];
    const message = first
      ? first.field
        ? `${first.field}: ${first.message}`
        : first.message
      : "Ma'lumotlar noto'g'ri";
    return res.status(400).json(fail(message, details));
  }

  if (err instanceof ApiError) {
    return res.status(err.status).json(fail(err.message));
  }

  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json(fail("JSON formati noto'g'ri"));
  }

  switch (err?.code) {
    case 'ER_DUP_ENTRY':
      return res.status(409).json(fail("Bunday ma'lumot allaqachon mavjud (masalan, email yoki nom band)"));
    case 'ER_ROW_IS_REFERENCED_2':
      return res
        .status(409)
        .json(fail("Bu yozuv boshqa ma'lumotlar bilan bog'langan, avval bog'liq yozuvlarni o'chiring"));
    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(400).json(fail("Bog'langan yozuv (fan, ustoz, guruh yoki talaba) topilmadi"));
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_WRONG_VALUE':
      return res.status(400).json(fail("Qiymat noto'g'ri (masalan, sana yoki ball)"));
  }

  console.error(err);
  return res.status(500).json(fail('Serverda ichki xatolik yuz berdi'));
};
