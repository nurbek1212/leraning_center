import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db';
import { env } from '../config/env';
import { ApiError, asyncHandler, ok } from '../utils/http';

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  const rows = await query<any>(
    'SELECT id, full_name, email, password, role, phone FROM users WHERE email = ?',
    [email]
  );
  const user = rows[0];
  // Email yoki parol xato bo'lsa bir xil xabar qaytariladi
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Email yoki parol noto'g'ri");
  }

  const token = jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);

  delete user.password;
  ok(res, { token, user }, 'Tizimga muvaffaqiyatli kirdingiz');
});

// Joriy foydalanuvchi + rolga qarab guruhlari / fanlari
export const me = asyncHandler(async (req, res) => {
  const user = req.user!;
  const [full] = await query<any>(
    'SELECT id, full_name, email, role, phone, created_at FROM users WHERE id = ?',
    [user.id]
  );

  let groups: unknown[] = [];
  let subjects: unknown[] = [];

  if (user.role === 'student') {
    groups = await query(
      `SELECT g.id, g.name, g.schedule, s.name AS subject_name, t.full_name AS teacher_name
       FROM group_students gs
       JOIN \`groups\` g ON g.id = gs.group_id
       JOIN subjects s ON s.id = g.subject_id
       JOIN users t ON t.id = g.teacher_id
       WHERE gs.student_id = ?
       ORDER BY g.name`,
      [user.id]
    );
  } else if (user.role === 'teacher') {
    groups = await query(
      `SELECT g.id, g.name, g.schedule, s.name AS subject_name
       FROM \`groups\` g JOIN subjects s ON s.id = g.subject_id
       WHERE g.teacher_id = ?
       ORDER BY g.name`,
      [user.id]
    );
    subjects = await query(
      `SELECT s.id, s.name FROM teacher_subjects ts
       JOIN subjects s ON s.id = ts.subject_id
       WHERE ts.teacher_id = ? ORDER BY s.name`,
      [user.id]
    );
  }

  ok(res, { ...full, groups, subjects });
});
