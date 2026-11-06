import { execute, query, transaction } from '../config/db';
import { assertGroupAccess } from '../utils/access';
import { ApiError, asyncHandler, ok } from '../utils/http';

// GET /api/attendance?groupId=&date=
// date berilmasa, guruhning barcha davomat yozuvlari qaytariladi
export const list = asyncHandler(async (req, res) => {
  const { groupId, date } = req.query as unknown as { groupId: number; date?: string };
  await assertGroupAccess(req.user!, groupId);

  const params: unknown[] = [groupId];
  let dateFilter = '';
  if (date) {
    dateFilter = 'AND a.date = ?';
    params.push(date);
  }

  const rows = await query(
    `SELECT a.id, a.group_id, a.student_id, u.full_name AS student_name, a.date, a.status
     FROM attendance a JOIN users u ON u.id = a.student_id
     WHERE a.group_id = ? ${dateFilter}
     ORDER BY a.date DESC, u.full_name`,
    params
  );
  ok(res, rows);
});

// POST /api/attendance  { groupId, date, records: [{ studentId, status }] }
export const save = asyncHandler(async (req, res) => {
  const { groupId, date, records } = req.body as {
    groupId: number;
    date: string;
    records: { studentId: number; status: 'present' | 'absent' }[];
  };
  await assertGroupAccess(req.user!, groupId);

  const members = await query<{ student_id: number }>(
    'SELECT student_id FROM group_students WHERE group_id = ?',
    [groupId]
  );
  const memberIds = new Set(members.map((m) => m.student_id));

  // Bir talaba ikki marta kelgan bo'lsa, oxirgisi olinadi
  const unique = new Map<number, 'present' | 'absent'>();
  for (const r of records) {
    if (!memberIds.has(r.studentId)) {
      throw new ApiError(400, "Ro'yxatda bu guruhga a'zo bo'lmagan talaba bor");
    }
    unique.set(r.studentId, r.status);
  }

  await transaction(async (conn) => {
    await execute(
      `INSERT INTO attendance (group_id, student_id, date, status) VALUES ?
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [[...unique.entries()].map(([studentId, status]) => [groupId, studentId, date, status])],
      conn
    );
  });

  ok(res, { groupId, date, count: unique.size }, 'Davomat saqlandi');
});
