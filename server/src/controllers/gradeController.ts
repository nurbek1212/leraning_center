import { execute, query } from '../config/db';
import { assertGroupAccess, isStudentInGroup } from '../utils/access';
import { assertScoreWithinMax, getPublishedComponentForGroup } from '../utils/grading';
import { ApiError, asyncHandler, ok } from '../utils/http';

const SELECT = `
  SELECT g.id, g.student_id, g.group_id, g.teacher_id, g.component_id, g.score, g.comment, g.date,
         st.full_name AS student_name, gr.name AS group_name, s.name AS subject_name,
         c.name AS component_name, c.max_score, c.is_exam
  FROM grades g
  JOIN users st ON st.id = g.student_id
  JOIN \`groups\` gr ON gr.id = g.group_id
  JOIN subjects s ON s.id = gr.subject_id
  JOIN grading_components c ON c.id = g.component_id`;

async function findOne(id: number) {
  const rows = await query<any>(`${SELECT} WHERE g.id = ?`, [id]);
  return rows[0];
}

// Bahoni va uning guruhi ustoziga tegishliligini tekshiradi
async function getOwnedGrade(gradeId: number, teacherId: number) {
  const rows = await query<{ id: number; group_id: number; component_id: number; group_teacher_id: number }>(
    `SELECT g.id, g.group_id, g.component_id, gr.teacher_id AS group_teacher_id
     FROM grades g JOIN \`groups\` gr ON gr.id = g.group_id
     WHERE g.id = ?`,
    [gradeId]
  );
  if (!rows.length) throw new ApiError(404, 'Baho topilmadi');
  if (rows[0].group_teacher_id !== teacherId) {
    throw new ApiError(403, 'Bu baho boshqa ustozning guruhiga tegishli');
  }
  return rows[0];
}

// GET /api/grades?groupId=&studentId=  (admin: hammasi, ustoz: faqat o'z guruhlari)
export const list = asyncHandler(async (req, res) => {
  const user = req.user!;
  const { groupId, studentId } = req.query as unknown as { groupId?: number; studentId?: number };

  const where: string[] = [];
  const params: unknown[] = [];

  if (groupId) {
    await assertGroupAccess(user, groupId);
    where.push('g.group_id = ?');
    params.push(groupId);
  } else if (user.role === 'teacher') {
    where.push('gr.teacher_id = ?');
    params.push(user.id);
  }
  if (studentId) {
    where.push('g.student_id = ?');
    params.push(studentId);
  }

  const rows = await query(
    `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY g.date DESC, g.id DESC`,
    params
  );
  ok(res, rows);
});

export const create = asyncHandler(async (req, res) => {
  const user = req.user!;
  const { studentId, groupId, componentId, score, comment, date } = req.body;

  await assertGroupAccess(user, groupId);
  if (!(await isStudentInGroup(groupId, studentId))) {
    throw new ApiError(400, "Bu talaba tanlangan guruhga a'zo emas");
  }

  // Mezon shu guruh fani uchun, e'lon qilingan va ball komponent maksimumidan oshmaydi
  const component = await getPublishedComponentForGroup(componentId, groupId);
  assertScoreWithinMax(score, component);

  const result = await execute(
    `INSERT INTO grades (student_id, group_id, teacher_id, component_id, score, comment, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [studentId, groupId, user.id, componentId, score, comment || null, date]
  );
  ok(res, await findOne(result.insertId), "Baho qo'yildi", 201);
});

// Komponent o'zgarmaydi (boshqa komponentga o'tkazish uchun bahoni o'chirib qayta qo'yiladi)
export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { score, comment, date } = req.body;

  const grade = await getOwnedGrade(id, req.user!.id);
  const component = await getPublishedComponentForGroup(grade.component_id, grade.group_id);
  assertScoreWithinMax(score, component);

  await execute('UPDATE grades SET score = ?, comment = ?, date = ? WHERE id = ?', [score, comment || null, date, id]);
  ok(res, await findOne(id), 'Baho yangilandi');
});

export const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const grade = await getOwnedGrade(id, req.user!.id);
  await getPublishedComponentForGroup(grade.component_id, grade.group_id); // mezon e'londan olingan bo'lsa o'zgartirib bo'lmaydi
  await execute('DELETE FROM grades WHERE id = ?', [id]);
  ok(res, null, "Baho o'chirildi");
});
