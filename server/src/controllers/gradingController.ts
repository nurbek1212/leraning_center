import type { PoolConnection } from 'mysql2/promise';
import { execute, query, transaction } from '../config/db';
import { ApiError, asyncHandler, ok } from '../utils/http';

/*
 * Baholash mezoni (admin). Har bir fan uchun bitta mezon: 100 ball qismlarga (komponentlarga) bo'linadi
 * (dars faolligi, uy vazifasi, imtihon va h.k.) va e'lon qilinadi. Faqat e'lon qilingan mezon bo'yicha baho qo'yiladi.
 *
 * Qoidalar:
 *  - qoralamada yig'indi 100 dan oshmasligi kerak, e'lon qilish uchun aynan 100 bo'lishi shart;
 *  - e'lon qilingan mezonni saqlashda ham yig'indi 100 bo'lishi shart;
 *  - baho qo'yilgan komponentni o'chirib bo'lmaydi va uning maksimumi qo'yilgan eng katta baholdan kam bo'la olmaydi.
 */

interface ComponentRow {
  id: number;
  name: string;
  max_score: number;
  is_exam: number;
  sort_order: number;
  grade_count: number;
  max_used: number;
}

async function loadScheme(subjectId: number, conn?: PoolConnection) {
  const [subject] = await query<{ id: number; name: string }>('SELECT id, name FROM subjects WHERE id = ?', [subjectId], conn);
  if (!subject) throw new ApiError(404, 'Fan topilmadi');

  const [scheme] = await query<{ id: number; description: string | null; status: 'draft' | 'published'; published_at: string | null }>(
    'SELECT id, description, status, published_at FROM grading_schemes WHERE subject_id = ?',
    [subjectId],
    conn
  );

  let components: ComponentRow[] = [];
  if (scheme) {
    components = await query<ComponentRow>(
      `SELECT c.id, c.name, c.max_score, c.is_exam, c.sort_order,
              (SELECT COUNT(*) FROM grades g WHERE g.component_id = c.id) AS grade_count,
              (SELECT COALESCE(MAX(g.score), 0) FROM grades g WHERE g.component_id = c.id) AS max_used
       FROM grading_components c
       WHERE c.scheme_id = ?
       ORDER BY c.sort_order, c.id`,
      [scheme.id],
      conn
    );
  }

  const mapped = components.map((c) => ({
    id: c.id,
    name: c.name,
    max_score: Number(c.max_score),
    is_exam: Boolean(c.is_exam),
    grade_count: Number(c.grade_count),
    max_used: Number(c.max_used),
  }));

  return {
    subject,
    scheme: scheme || null,
    components: mapped,
    total: mapped.reduce((sum, c) => sum + c.max_score, 0),
  };
}

// Barcha fanlar va ularning mezon holati
export const list = asyncHandler(async (_req, res) => {
  const rows = await query<any>(
    `SELECT s.id AS subject_id, s.name AS subject_name,
            sc.id AS scheme_id, sc.status, sc.published_at,
            (SELECT COUNT(*) FROM grading_components c WHERE c.scheme_id = sc.id) AS component_count,
            (SELECT COALESCE(SUM(c.max_score), 0) FROM grading_components c WHERE c.scheme_id = sc.id) AS total,
            (SELECT COUNT(*) FROM grades g
               JOIN grading_components c ON c.id = g.component_id WHERE c.scheme_id = sc.id) AS grade_count,
            (SELECT COUNT(*) FROM \`groups\` gg WHERE gg.subject_id = s.id) AS group_count
     FROM subjects s
     LEFT JOIN grading_schemes sc ON sc.subject_id = s.id
     ORDER BY s.name`
  );
  ok(
    res,
    rows.map((r) => ({
      ...r,
      component_count: Number(r.component_count ?? 0),
      total: Number(r.total ?? 0),
      grade_count: Number(r.grade_count ?? 0),
      group_count: Number(r.group_count ?? 0),
    }))
  );
});

export const getOne = asyncHandler(async (req, res) => {
  ok(res, await loadScheme(Number(req.params.subjectId)));
});

// Mezonni saqlash: komponentlar ro'yxati to'liq almashtiriladi (id berilganlari yangilanadi, yangilari qo'shiladi)
export const save = asyncHandler(async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const { description, components } = req.body as {
    description?: string | null;
    components: { id?: number; name: string; maxScore: number; isExam: boolean }[];
  };

  await transaction(async (conn) => {
    const [subject] = await query('SELECT id FROM subjects WHERE id = ?', [subjectId], conn);
    if (!subject) throw new ApiError(404, 'Fan topilmadi');

    // Mezon yo'q bo'lsa qoralama sifatida yaratiladi; id doim qaytadi (LAST_INSERT_ID trick)
    const upsert = await execute(
      `INSERT INTO grading_schemes (subject_id, description) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description), id = LAST_INSERT_ID(id)`,
      [subjectId, description || null],
      conn
    );
    const schemeId = upsert.insertId;

    // Mezonni qulflaymiz, parallel tahrirlar bir-biriga xalaqit bermasin
    const [scheme] = await query<{ status: 'draft' | 'published' }>(
      'SELECT status FROM grading_schemes WHERE id = ? FOR UPDATE',
      [schemeId],
      conn
    );

    const existing = await query<ComponentRow>(
      `SELECT c.id, c.name, c.max_score, c.is_exam, c.sort_order,
              (SELECT COUNT(*) FROM grades g WHERE g.component_id = c.id) AS grade_count,
              (SELECT COALESCE(MAX(g.score), 0) FROM grades g WHERE g.component_id = c.id) AS max_used
       FROM grading_components c WHERE c.scheme_id = ? FOR UPDATE`,
      [schemeId],
      conn
    );
    const existingById = new Map(existing.map((c) => [c.id, c]));

    const keptIds = new Set<number>();
    for (const c of components) {
      if (c.id !== undefined) {
        const row = existingById.get(c.id);
        if (!row) throw new ApiError(400, "Mezon komponenti topilmadi yoki boshqa fanga tegishli");
        if (keptIds.has(c.id)) throw new ApiError(400, 'Bir komponent ikki marta yuborilgan');
        if (c.maxScore < Number(row.max_used)) {
          throw new ApiError(
            400,
            `"${row.name}" uchun ${row.max_used} ball allaqachon qo'yilgan, maksimum bundan kam bo'lishi mumkin emas`
          );
        }
        keptIds.add(c.id);
      }
    }

    // Olib tashlangan komponentlar: bahosi borini o'chirib bo'lmaydi
    for (const row of existing) {
      if (keptIds.has(row.id)) continue;
      if (Number(row.grade_count) > 0) {
        throw new ApiError(409, `"${row.name}" komponentiga baho qo'yilgan, uni o'chirib bo'lmaydi`);
      }
      await execute('DELETE FROM grading_components WHERE id = ?', [row.id], conn);
    }

    // Nomlar almashib qolganda UNIQUE to'qnashmasligi uchun avval vaqtinchalik nom beramiz
    for (const id of keptIds) {
      await execute('UPDATE grading_components SET name = CONCAT(\'__tmp__\', id) WHERE id = ?', [id], conn);
    }
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      if (c.id !== undefined) {
        await execute(
          'UPDATE grading_components SET name = ?, max_score = ?, is_exam = ?, sort_order = ? WHERE id = ?',
          [c.name, c.maxScore, c.isExam ? 1 : 0, i + 1, c.id],
          conn
        );
      } else {
        await execute(
          'INSERT INTO grading_components (scheme_id, name, max_score, is_exam, sort_order) VALUES (?, ?, ?, ?, ?)',
          [schemeId, c.name, c.maxScore, c.isExam ? 1 : 0, i + 1],
          conn
        );
      }
    }

    const total = components.reduce((sum, c) => sum + c.maxScore, 0);
    if (scheme.status === 'published' && total !== 100) {
      throw new ApiError(
        400,
        `E'lon qilingan mezonning ballari yig'indisi aynan 100 bo'lishi kerak (hozir ${total}). Avval e'londan olib tashlang yoki ballarni to'g'rilang`
      );
    }
  });

  ok(res, await loadScheme(subjectId), 'Baholash mezoni saqlandi');
});

export const publish = asyncHandler(async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const data = await loadScheme(subjectId);
  if (!data.scheme) throw new ApiError(400, "Avval mezonni yarating va saqlang");
  if (!data.components.length) throw new ApiError(400, "Kamida bitta mezon qo'shing");
  if (data.total !== 100) {
    throw new ApiError(400, `E'lon qilish uchun ballar yig'indisi aynan 100 bo'lishi kerak (hozir ${data.total})`);
  }

  await execute(
    "UPDATE grading_schemes SET status = 'published', published_at = COALESCE(published_at, NOW()) WHERE id = ?",
    [data.scheme.id]
  );
  ok(res, await loadScheme(subjectId), "Baholash mezoni e'lon qilindi");
});

export const unpublish = asyncHandler(async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const data = await loadScheme(subjectId);
  if (!data.scheme) throw new ApiError(404, 'Mezon topilmadi');
  await execute("UPDATE grading_schemes SET status = 'draft' WHERE id = ?", [data.scheme.id]);
  ok(res, await loadScheme(subjectId), "Mezon e'londan olindi (ustozlar baho qo'ya olmaydi)");
});

export const remove = asyncHandler(async (req, res) => {
  const subjectId = Number(req.params.subjectId);
  const data = await loadScheme(subjectId);
  if (!data.scheme) throw new ApiError(404, 'Mezon topilmadi');
  const gradeTotal = data.components.reduce((sum, c) => sum + c.grade_count, 0);
  if (gradeTotal > 0) throw new ApiError(409, "Bu mezon bo'yicha baholar qo'yilgan, uni o'chirib bo'lmaydi");

  await execute('DELETE FROM grading_schemes WHERE id = ?', [data.scheme.id]);
  ok(res, null, "Mezon o'chirildi");
});
