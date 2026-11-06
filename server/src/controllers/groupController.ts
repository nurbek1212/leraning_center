import { execute, query, transaction } from '../config/db';
import { assertGroupAccess, isStudentInGroup } from '../utils/access';
import { getBreakdowns, round1 } from '../utils/grading';
import { ApiError, asyncHandler, ListQuery, ok, paged } from '../utils/http';
import { findOrCreateSubject } from '../utils/subjects';

const SELECT = `
  SELECT g.id, g.name, g.subject_id, g.teacher_id, g.schedule, g.price, g.created_at,
         s.name AS subject_name, t.full_name AS teacher_name,
         (SELECT COUNT(*) FROM group_students gs WHERE gs.group_id = g.id) AS student_count
  FROM \`groups\` g
  JOIN subjects s ON s.id = g.subject_id
  JOIN users t ON t.id = g.teacher_id`;

async function assertTeacher(teacherId: number) {
  const teacher = await query("SELECT id FROM users WHERE id = ? AND role = 'teacher'", [teacherId]);
  if (!teacher.length) throw new ApiError(400, 'Tanlangan ustoz topilmadi');
}

async function findOne(id: number) {
  const rows = await query<any>(`${SELECT} WHERE g.id = ?`, [id]);
  return rows[0];
}

// ---------- Admin ----------

export const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query as unknown as ListQuery;
  const like = `%${search}%`;
  const where = 'WHERE g.name LIKE ? OR s.name LIKE ? OR t.full_name LIKE ?';

  const [{ total }] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM \`groups\` g
     JOIN subjects s ON s.id = g.subject_id
     JOIN users t ON t.id = g.teacher_id ${where}`,
    [like, like, like]
  );
  const items = await query(`${SELECT} ${where} ORDER BY g.id DESC LIMIT ? OFFSET ?`, [
    like,
    like,
    like,
    limit,
    (page - 1) * limit,
  ]);

  ok(res, paged(items, Number(total), page, limit));
});

export const getOne = asyncHandler(async (req, res) => {
  const group = await findOne(Number(req.params.id));
  if (!group) throw new ApiError(404, 'Guruh topilmadi');
  ok(res, group);
});

// Fan nomi yozib kiritiladi: mavjud bo'lmasa avtomatik yaratiladi, ustozga ham biriktiriladi
export const create = asyncHandler(async (req, res) => {
  const { name, subjectName, teacherId, schedule, price } = req.body;
  await assertTeacher(teacherId);

  const id = await transaction(async (conn) => {
    const subjectId = await findOrCreateSubject(subjectName, conn);
    const result = await execute(
      'INSERT INTO `groups` (name, subject_id, teacher_id, schedule, price) VALUES (?, ?, ?, ?, ?)',
      [name, subjectId, teacherId, schedule || null, price],
      conn
    );
    await execute('INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)', [teacherId, subjectId], conn);
    return result.insertId;
  });

  ok(res, await findOne(id), "Guruh qo'shildi", 201);
});

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, subjectName, teacherId, schedule, price } = req.body;
  await assertTeacher(teacherId);

  await transaction(async (conn) => {
    const [current] = await query<{ subject_id: number }>('SELECT subject_id FROM `groups` WHERE id = ? FOR UPDATE', [id], conn);
    if (!current) throw new ApiError(404, 'Guruh topilmadi');

    const subjectId = await findOrCreateSubject(subjectName, conn);

    // Baholar fan mezoniga bog'langan: guruhda baho bo'lsa fanni almashtirib bo'lmaydi
    if (subjectId !== current.subject_id) {
      const [{ cnt }] = await query<{ cnt: number }>('SELECT COUNT(*) AS cnt FROM grades WHERE group_id = ?', [id], conn);
      if (Number(cnt) > 0) {
        throw new ApiError(409, "Bu guruhda baholar bor, shuning uchun fanni o'zgartirib bo'lmaydi");
      }
    }

    await execute(
      'UPDATE `groups` SET name = ?, subject_id = ?, teacher_id = ?, schedule = ?, price = ? WHERE id = ?',
      [name, subjectId, teacherId, schedule || null, price, id],
      conn
    );
    await execute('INSERT IGNORE INTO teacher_subjects (teacher_id, subject_id) VALUES (?, ?)', [teacherId, subjectId], conn);
  });

  ok(res, await findOne(id), 'Guruh yangilandi');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await execute('DELETE FROM `groups` WHERE id = ?', [Number(req.params.id)]);
  if (!result.affectedRows) throw new ApiError(404, 'Guruh topilmadi');
  ok(res, null, "Guruh o'chirildi");
});

// ---------- Ustoz ----------

export const myGroups = asyncHandler(async (req, res) => {
  const groups = await query(`${SELECT} WHERE g.teacher_id = ? ORDER BY g.name`, [req.user!.id]);
  ok(res, groups);
});

// Guruh talabalari: har biri uchun jami ball (mezon bo'yicha) va davomat foizi
export const groupStudents = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const group = await assertGroupAccess(req.user!, groupId);

  const students = await query<any>(
    `SELECT u.id, u.full_name, u.email, u.phone
     FROM group_students gs JOIN users u ON u.id = gs.student_id
     WHERE gs.group_id = ?
     ORDER BY u.full_name`,
    [groupId]
  );

  // Komponent natijasi = o'rtacha, jami = komponent natijalari yig'indisi
  const totals = await query<{ student_id: number; total: number; grades_count: number }>(
    `SELECT x.student_id, SUM(x.avg_score) AS total, SUM(x.cnt) AS grades_count
     FROM (SELECT g.student_id, g.component_id, AVG(g.score) AS avg_score, COUNT(*) AS cnt
           FROM grades g WHERE g.group_id = ?
           GROUP BY g.student_id, g.component_id) x
     GROUP BY x.student_id`,
    [groupId]
  );
  const totalsMap = new Map(totals.map((t) => [t.student_id, t]));

  const attendance = await query<{ student_id: number; total: number; present: number }>(
    `SELECT student_id, COUNT(*) AS total, SUM(status = 'present') AS present
     FROM attendance WHERE group_id = ? GROUP BY student_id`,
    [groupId]
  );
  const attendanceMap = new Map(attendance.map((a) => [a.student_id, a]));

  const [scheme] = await query<{ status: 'draft' | 'published'; max_total: number }>(
    `SELECT sc.status,
            (SELECT COALESCE(SUM(c.max_score), 0) FROM grading_components c WHERE c.scheme_id = sc.id) AS max_total
     FROM grading_schemes sc WHERE sc.subject_id = ?`,
    [group.subject_id]
  );

  ok(res, {
    group: {
      id: group.id,
      name: group.name,
      subject_name: group.subject_name,
      schedule: group.schedule,
      scheme: scheme ? { status: scheme.status, max_total: Number(scheme.max_total) } : null,
    },
    students: students.map((s) => {
      const t = totalsMap.get(s.id);
      const a = attendanceMap.get(s.id);
      const attTotal = a ? Number(a.total) : 0;
      return {
        ...s,
        total: t ? round1(Number(t.total)) : null,
        grades_count: t ? Number(t.grades_count) : 0,
        attendance_percent: attTotal ? Math.round((Number(a!.present) / attTotal) * 100) : null,
      };
    }),
  });
});

// Bitta talabaning guruhdagi to'liq ma'lumoti: profil, mezon bo'yicha natija, baholar tarixi, davomat.
// Ustoz baholashni shu sahifadan boshlaydi, talabani qayta tanlash shart emas.
export const studentDetail = asyncHandler(async (req, res) => {
  const groupId = Number(req.params.id);
  const studentId = Number(req.params.studentId);
  const group = await assertGroupAccess(req.user!, groupId);

  if (!(await isStudentInGroup(groupId, studentId))) throw new ApiError(404, 'Talaba bu guruhda topilmadi');

  const [student] = await query<any>('SELECT id, full_name, email, phone, created_at FROM users WHERE id = ?', [studentId]);
  const [breakdown] = await getBreakdowns(studentId, groupId);

  const grades = await query(
    `SELECT g.id, g.component_id, g.score, g.comment, g.date,
            c.name AS component_name, c.max_score, c.is_exam
     FROM grades g JOIN grading_components c ON c.id = g.component_id
     WHERE g.student_id = ? AND g.group_id = ?
     ORDER BY g.date DESC, g.id DESC`,
    [studentId, groupId]
  );

  const records = await query(
    'SELECT id, date, status FROM attendance WHERE group_id = ? AND student_id = ? ORDER BY date DESC LIMIT 30',
    [groupId, studentId]
  );
  const [summary] = await query<{ total: number; present: number }>(
    "SELECT COUNT(*) AS total, COALESCE(SUM(status = 'present'), 0) AS present FROM attendance WHERE group_id = ? AND student_id = ?",
    [groupId, studentId]
  );
  const total = Number(summary.total);
  const present = Number(summary.present);

  ok(res, {
    group: { id: group.id, name: group.name, subject_name: group.subject_name, schedule: group.schedule },
    student,
    breakdown: breakdown || null,
    grades,
    attendance: {
      records,
      summary: { total, present, absent: total - present, percent: total ? Math.round((present / total) * 100) : 0 },
    },
  });
});
