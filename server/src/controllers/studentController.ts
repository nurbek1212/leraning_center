import bcrypt from 'bcrypt';
import { execute, query, transaction } from '../config/db';
import { getBreakdowns, round1 } from '../utils/grading';
import { ApiError, asyncHandler, ListQuery, ok, paged } from '../utils/http';

const FIELDS = 'id, full_name, email, phone, created_at';

// Har bir talabaga biriktirilgan guruhlar ro'yxatini qo'shadi
async function attachGroups<T extends { id: number }>(rows: T[]) {
  if (!rows.length) return rows.map((r) => ({ ...r, groups: [] as { id: number; name: string }[] }));
  const groups = await query<{ student_id: number; id: number; name: string }>(
    `SELECT gs.student_id, g.id, g.name
     FROM group_students gs JOIN \`groups\` g ON g.id = gs.group_id
     WHERE gs.student_id IN (?) ORDER BY g.name`,
    [rows.map((r) => r.id)]
  );
  return rows.map((r) => ({
    ...r,
    groups: groups.filter((g) => g.student_id === r.id).map((g) => ({ id: g.id, name: g.name })),
  }));
}

// ---------- Admin ----------

export const list = asyncHandler(async (req, res) => {
  const { page, limit, search, groupId } = req.query as unknown as ListQuery & { groupId?: number };
  const like = `%${search}%`;

  let where = "u.role = 'student' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)";
  const params: unknown[] = [like, like, like];
  if (groupId) {
    where += ' AND EXISTS (SELECT 1 FROM group_students gs WHERE gs.student_id = u.id AND gs.group_id = ?)';
    params.push(groupId);
  }

  const [{ total }] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM users u WHERE ${where}`,
    params
  );
  const rows = await query<any>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.created_at
     FROM users u WHERE ${where} ORDER BY u.full_name LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );

  ok(res, paged(await attachGroups(rows), Number(total), page, limit));
});

export const getOne = asyncHandler(async (req, res) => {
  const rows = await query<any>(`SELECT ${FIELDS} FROM users WHERE id = ? AND role = 'student'`, [
    Number(req.params.id),
  ]);
  if (!rows.length) throw new ApiError(404, 'Talaba topilmadi');
  ok(res, (await attachGroups(rows))[0]);
});

export const create = asyncHandler(async (req, res) => {
  const { full_name, email, password, phone, groupIds } = req.body as {
    full_name: string;
    email: string;
    password: string;
    phone?: string | null;
    groupIds: number[];
  };
  const hash = await bcrypt.hash(password, 10);
  const uniqueGroups = [...new Set(groupIds)];

  const newId = await transaction(async (conn) => {
    const result = await execute(
      "INSERT INTO users (full_name, email, password, role, phone) VALUES (?, ?, ?, 'student', ?)",
      [full_name, email, hash, phone || null],
      conn
    );
    if (uniqueGroups.length) {
      await execute(
        'INSERT INTO group_students (group_id, student_id) VALUES ?',
        [uniqueGroups.map((gid) => [gid, result.insertId])],
        conn
      );
    }
    return result.insertId;
  });

  const rows = await query<any>(`SELECT ${FIELDS} FROM users WHERE id = ?`, [newId]);
  ok(res, (await attachGroups(rows))[0], "Talaba qo'shildi", 201);
});

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { full_name, email, password, phone, groupIds } = req.body as {
    full_name: string;
    email: string;
    password?: string;
    phone?: string | null;
    groupIds: number[];
  };
  const uniqueGroups = [...new Set(groupIds)];

  const exists = await query("SELECT id FROM users WHERE id = ? AND role = 'student'", [id]);
  if (!exists.length) throw new ApiError(404, 'Talaba topilmadi');

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
    // Faqat olib tashlangan guruhlardan chiqariladi, qolganlarining baho/davomati saqlanadi
    if (uniqueGroups.length) {
      await execute('DELETE FROM group_students WHERE student_id = ? AND group_id NOT IN (?)', [id, uniqueGroups], conn);
      await execute(
        'INSERT IGNORE INTO group_students (group_id, student_id) VALUES ?',
        [uniqueGroups.map((gid) => [gid, id])],
        conn
      );
    } else {
      await execute('DELETE FROM group_students WHERE student_id = ?', [id], conn);
    }
  });

  const rows = await query<any>(`SELECT ${FIELDS} FROM users WHERE id = ?`, [id]);
  ok(res, (await attachGroups(rows))[0], 'Talaba yangilandi');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await execute("DELETE FROM users WHERE id = ? AND role = 'student'", [
    Number(req.params.id),
  ]);
  if (!result.affectedRows) throw new ApiError(404, 'Talaba topilmadi');
  ok(res, null, "Talaba o'chirildi");
});

// ---------- Talaba (faqat o'zining ma'lumoti) ----------

// Guruhlar bo'yicha mezon asosidagi natija (komponentlar, jami ball) va barcha baholar ro'yxati
export const myGrades = asyncHandler(async (req, res) => {
  const studentId = req.user!.id;

  const groups = await getBreakdowns(studentId);

  const grades = await query(
    `SELECT g.id, g.score, g.comment, g.date,
            gr.id AS group_id, gr.name AS group_name,
            s.id AS subject_id, s.name AS subject_name,
            c.name AS component_name, c.max_score, c.is_exam,
            t.full_name AS teacher_name
     FROM grades g
     JOIN \`groups\` gr ON gr.id = g.group_id
     JOIN subjects s ON s.id = gr.subject_id
     JOIN grading_components c ON c.id = g.component_id
     JOIN users t ON t.id = g.teacher_id
     WHERE g.student_id = ?
     ORDER BY g.date DESC, g.id DESC`,
    [studentId]
  );

  // Umumiy natija: baho qo'yilgan guruhlar bo'yicha foizlarning o'rtachasi
  const graded = groups.filter((g) => g.grades_count > 0 && g.max_total > 0);
  const overall = graded.length
    ? round1(graded.reduce((sum, g) => sum + (g.total / g.max_total) * 100, 0) / graded.length)
    : null;

  ok(res, { groups, grades, overall });
});

export const myAttendance = asyncHandler(async (req, res) => {
  const studentId = req.user!.id;

  const records = await query<{ status: 'present' | 'absent' }>(
    `SELECT a.id, a.date, a.status, gr.id AS group_id, gr.name AS group_name, s.name AS subject_name
     FROM attendance a
     JOIN \`groups\` gr ON gr.id = a.group_id
     JOIN subjects s ON s.id = gr.subject_id
     WHERE a.student_id = ?
     ORDER BY a.date DESC, a.id DESC`,
    [studentId]
  );

  const present = records.filter((r) => r.status === 'present').length;
  const total = records.length;
  ok(res, {
    records,
    summary: {
      total,
      present,
      absent: total - present,
      percent: total ? Math.round((present / total) * 100) : 0,
    },
  });
});
