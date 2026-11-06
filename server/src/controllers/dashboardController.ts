import { query } from '../config/db';
import { asyncHandler, ok } from '../utils/http';
import { round1 } from '../utils/grading';

export const stats = asyncHandler(async (_req, res) => {
  const [counts] = await query<any>(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
       (SELECT COUNT(*) FROM users WHERE role = 'teacher') AS teachers,
       (SELECT COUNT(*) FROM \`groups\`) AS \`groups\`,
       (SELECT COUNT(*) FROM subjects) AS subjects`
  );

  // Fanlar bo'yicha talabalar soni (fanning guruhlaridagi noyob talabalar)
  const studentsBySubject = await query<any>(
    `SELECT s.id, s.name, COUNT(DISTINCT gs.student_id) AS students
     FROM subjects s
     LEFT JOIN \`groups\` g ON g.subject_id = s.id
     LEFT JOIN group_students gs ON gs.group_id = g.id
     GROUP BY s.id, s.name
     ORDER BY s.name`
  );

  // Guruh bo'yicha o'rtacha ball = guruh talabalarining jami ballari o'rtachasi
  // (talabaning jami balli = mezon komponentlari natijalari yig'indisi)
  const averageByGroup = await query<any>(
    `SELECT g.id, g.name, AVG(t.total) AS average
     FROM \`groups\` g
     LEFT JOIN (
       SELECT c.group_id, c.student_id, SUM(c.avg_score) AS total
       FROM (SELECT group_id, student_id, component_id, AVG(score) AS avg_score
             FROM grades GROUP BY group_id, student_id, component_id) c
       GROUP BY c.group_id, c.student_id
     ) t ON t.group_id = g.id
     GROUP BY g.id, g.name
     ORDER BY g.name`
  );

  const latestGrades = await query(
    `SELECT g.id, g.score, g.date,
            c.name AS component_name, c.max_score,
            st.full_name AS student_name, gr.name AS group_name, t.full_name AS teacher_name
     FROM grades g
     JOIN grading_components c ON c.id = g.component_id
     JOIN users st ON st.id = g.student_id
     JOIN users t ON t.id = g.teacher_id
     JOIN \`groups\` gr ON gr.id = g.group_id
     ORDER BY g.id DESC
     LIMIT 5`
  );

  // Joriy oy to'lovlari (Toshkent vaqti bo'yicha oy)
  const period = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }).slice(0, 7);
  const [money] = await query<any>(
    `SELECT
       COALESCE((SELECT SUM(amount) FROM payments WHERE period = ? AND status = 'paid'), 0) AS paid,
       COALESCE((SELECT SUM(g.price) FROM group_students gs JOIN \`groups\` g ON g.id = gs.group_id), 0) AS expected`,
    [period]
  );
  const paid = Number(money.paid);
  const expected = Number(money.expected);

  ok(res, {
    counts: {
      students: Number(counts.students),
      teachers: Number(counts.teachers),
      groups: Number(counts.groups),
      subjects: Number(counts.subjects),
    },
    studentsBySubject: studentsBySubject.map((r) => ({ ...r, students: Number(r.students) })),
    averageByGroup: averageByGroup.map((r) => ({
      ...r,
      average: r.average == null ? 0 : round1(Number(r.average)),
    })),
    latestGrades,
    payments: { period, paid, expected, debt: Math.max(0, expected - paid) },
  });
});
