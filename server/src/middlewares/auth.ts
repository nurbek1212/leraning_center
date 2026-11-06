import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { env } from '../config/env';
import type { AuthUser } from '../types/express';
import { ApiError, asyncHandler } from '../utils/http';

// Authorization: Bearer <token> ni tekshiradi va req.user ni to'ldiradi
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Avtorizatsiya talab qilinadi');
  }

  let payload: { id: number };
  try {
    payload = jwt.verify(header.slice(7), env.jwtSecret) as unknown as { id: number };
  } catch {
    throw new ApiError(401, 'Token yaroqsiz yoki muddati tugagan');
  }

  // Foydalanuvchi o'chirilgan bo'lsa, eski token ishlamasligi uchun bazadan tekshiramiz
  const rows = await query<AuthUser>(
    'SELECT id, full_name, email, role, phone FROM users WHERE id = ?',
    [payload.id]
  );
  if (!rows.length) throw new ApiError(401, 'Foydalanuvchi topilmadi');

  req.user = rows[0];
  next();
});
