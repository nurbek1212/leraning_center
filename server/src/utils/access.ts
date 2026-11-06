import { query } from '../config/db';
import type { AuthUser } from '../types/express';
import { ApiError } from './http';

export interface GroupRow {
  id: number;
  name: string;
  subject_id: number;
  teacher_id: number;
  schedule: string | null;
  subject_name: string;
}

// Guruh mavjudligini va foydalanuvchi unga kirish huquqini tekshiradi.
// Admin hamma guruhni ko'radi, ustoz faqat o'zinikini.
export async function assertGroupAccess(user: AuthUser, groupId: number): Promise<GroupRow> {
  const rows = await query<GroupRow>(
    `SELECT g.id, g.name, g.subject_id, g.teacher_id, g.schedule, s.name AS subject_name
     FROM \`groups\` g JOIN subjects s ON s.id = g.subject_id
     WHERE g.id = ?`,
    [groupId]
  );
  if (!rows.length) throw new ApiError(404, 'Guruh topilmadi');
  const group = rows[0];
  if (user.role === 'teacher' && group.teacher_id !== user.id) {
    throw new ApiError(403, "Bu guruh sizga biriktirilmagan");
  }
  return group;
}

export async function isStudentInGroup(groupId: number, studentId: number): Promise<boolean> {
  const rows = await query('SELECT 1 FROM group_students WHERE group_id = ? AND student_id = ?', [
    groupId,
    studentId,
  ]);
  return rows.length > 0;
}
