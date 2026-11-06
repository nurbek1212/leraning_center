import bcrypt from 'bcrypt';
import type { PoolConnection } from 'mysql2/promise';
import { execute, query, transaction } from '../config/db';
import { ApiError, asyncHandler, ListQuery, ok, paged } from '../utils/http';
import { findOrCreateSubject, uniqueSubjectNames } from '../utils/subjects';

const FIELDS = 'id, full_name, email, phone, created_at';

// Har bir ustozga o'qitadigan fanlari ro'yxatini qo'shadi
async function attachSubjects<T extends { id: number }>(rows: T[]) {
  if (!rows.length) return rows.map((r) => ({ ...r, subjects: [] as { id: number; name: string }[] }));
  const subs = await query<{ teacher_id: number; id: number; name: string }>(
    `SELECT ts.teacher_id, s.id, s.name
     FROM teacher_subjects ts JOIN subjects s ON s.id = ts.subject_id
     WHERE ts.teacher_id IN (?) ORDER BY s.name`,
    [rows.map((r) => r.id)]
  );
  return rows.map((r) => ({
    ...r,
    subjects: subs.filter((s) => s.teacher_id === r.id).map((s) => ({ id: s.id, name: s.name })),
  }));
}

// Yozib kiritilgan fan nomlarini fan id larga aylantiradi (yo'q fanlar avtomatik yaratiladi).
// Ustoz hozir o'qitayotgan guruhlarining fanlari ro'yxatdan tushib qolmaydi.
async function resolveSubjectIds(conn: PoolConnection, names: string[], teacherId?: number): Promise<number[]> {
  const ids = new Set<number>();
  for (const name of uniqueSubjectNames(names)) ids.add(await findOrCreateSubject(name, conn));
  if (teacherId) {
    const taught = await query<{ subject_id: number }>(
      'SELECT DISTINCT subject_id FROM `groups` WHERE teacher_id = ?',
      [teacherId],
      conn
    );
    taught.forEach((t) => ids.add(t.subject_id));
  }
  return [...ids];
}

export const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query as unknown as ListQuery;
  const like = `%${search}%`;
  const where = "role = 'teacher' AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)";

  const [{ total }] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM users WHERE ${where}`,
    [like, like, like]
  );
  const rows = await query<any>(
    `SELECT ${FIELDS} FROM users WHERE ${where} ORDER BY full_name LIMIT ? OFFSET ?`,
    [like, like, like, limit, (page - 1) * limit]
  );

  ok(res, paged(await attachSubjects(rows), Number(total), page, limit));
});

export const getOne = asyncHandler(async (req, res) => {
  const rows = await query<any>(`SELECT ${FIELDS} FROM users WHERE id = ? AND role = 'teacher'`, [
    Number(req.params.id),
  ]);
  if (!rows.length) throw new ApiError(404, 'Ustoz topilmadi');
  ok(res, (await attachSubjects(rows))[0]);
});

export const create = asyncHandler(async (req, res) => {
  const { full_name, email, password, phone, subjectNames } = req.body as {
    full_name: string;
    email: string;
    password: string;
    phone?: string | null;
    subjectNames: string[];
  };
  const hash = await bcrypt.hash(password, 10);

  const newId = await transaction(async (conn) => {
    const result = await execute(
      "INSERT INTO users (full_name, email, password, role, phone) VALUES (?, ?, ?, 'teacher', ?)",
      [full_name, email, hash, phone || null],
      conn
    );
    const subjectIds = await resolveSubjectIds(conn, subjectNames);
    if (subjectIds.length) {
      await execute(
        'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ?',
        [subjectIds.map((sid) => [result.insertId, sid])],
        conn
      );
    }
    return result.insertId;
  });

  const rows = await query<any>(`SELECT ${FIELDS} FROM users WHERE id = ?`, [newId]);
  ok(res, (await attachSubjects(rows))[0], "Ustoz qo'shildi", 201);
});

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { full_name, email, password, phone, subjectNames } = req.body as {
    full_name: string;
    email: string;
    password?: string;
    phone?: string | null;
    subjectNames: string[];
  };

  const exists = await query("SELECT id FROM users WHERE id = ? AND role = 'teacher'", [id]);
  if (!exists.length) throw new ApiError(404, 'Ustoz topilmadi');

  await transaction(async (conn) => {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await execute(
        'UPDATE users SET full_name = ?, email = ?, phone = ?, password = ? WHERE id = ?',
        [full_name, email, phone || null, hash, id],
        conn
      );
    } else {
      await execute(
        'UPDATE users SET full_name = ?, email = ?, phone = ? WHERE id = ?',
        [full_name, email, phone || null, id],
        conn
      );
    }

    const subjectIds = await resolveSubjectIds(conn, subjectNames, id);
    await execute('DELETE FROM teacher_subjects WHERE teacher_id = ?', [id], conn);
    if (subjectIds.length) {
      await execute(
        'INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ?',
        [subjectIds.map((sid) => [id, sid])],
        conn
      );
    }
  });

  const rows = await query<any>(`SELECT ${FIELDS} FROM users WHERE id = ?`, [id]);
  ok(res, (await attachSubjects(rows))[0], 'Ustoz yangilandi');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await execute("DELETE FROM users WHERE id = ? AND role = 'teacher'", [
    Number(req.params.id),
  ]);
  if (!result.affectedRows) throw new ApiError(404, 'Ustoz topilmadi');
  ok(res, null, "Ustoz o'chirildi");
});
