import { query } from '../config/db';
import { ApiError } from './http';

export const round1 = (v: number) => Math.round(v * 10) / 10;

export interface ComponentResult {
  id: number;
  name: string;
  max_score: number;
  is_exam: boolean;
  earned: number | null; // komponent bo'yicha qo'yilgan baholarning o'rtachasi (baho yo'q bo'lsa null)
  count: number;
}

export interface GroupBreakdown {
  group_id: number;
  group_name: string;
  subject_id: number;
  subject_name: string;
  scheme_status: 'draft' | 'published' | null;
  scheme_description: string | null;
  components: ComponentResult[];
  total: number; // to'plangan ball (komponentlar natijalari yig'indisi)
  max_total: number; // mezon bo'yicha maksimal ball (e'lon qilingan mezonda 100)
  grades_count: number;
}

interface Row {
  group_id: number;
  group_name: string;
  subject_id: number;
  subject_name: string;
  scheme_status: 'draft' | 'published' | null;
  scheme_description: string | null;
  component_id: number | null;
  component_name: string | null;
  max_score: number | null;
  is_exam: number | null;
  earned: number | null;
  cnt: number | null;
}

/*
 * Talabaning guruhlar bo'yicha natijasi.
 * Komponent natijasi = shu komponent bo'yicha qo'yilgan baholarning o'rtachasi.
 * Jami ball = komponent natijalarining yig'indisi (mezon 100 ball bo'lsa, jami 100 dan oshmaydi).
 * groupId berilsa, faqat shu guruh qaytariladi.
 */
export async function getBreakdowns(studentId: number, groupId?: number): Promise<GroupBreakdown[]> {
  const params: unknown[] = [studentId];
  let groupFilter = '';
  if (groupId) {
    groupFilter = 'AND gr.id = ?';
    params.push(groupId);
  }

  const rows = await query<Row>(
    `SELECT gr.id AS group_id, gr.name AS group_name,
            s.id AS subject_id, s.name AS subject_name,
            sc.status AS scheme_status, sc.description AS scheme_description,
            c.id AS component_id, c.name AS component_name, c.max_score, c.is_exam,
            (SELECT AVG(g.score) FROM grades g
              WHERE g.student_id = gs.student_id AND g.group_id = gr.id AND g.component_id = c.id) AS earned,
            (SELECT COUNT(*) FROM grades g
              WHERE g.student_id = gs.student_id AND g.group_id = gr.id AND g.component_id = c.id) AS cnt
     FROM group_students gs
     JOIN \`groups\` gr ON gr.id = gs.group_id
     JOIN subjects s ON s.id = gr.subject_id
     LEFT JOIN grading_schemes sc ON sc.subject_id = s.id
     LEFT JOIN grading_components c ON c.scheme_id = sc.id
     WHERE gs.student_id = ? ${groupFilter}
     ORDER BY gr.name, c.sort_order, c.id`,
    params
  );

  const byGroup = new Map<number, GroupBreakdown>();
  for (const r of rows) {
    let entry = byGroup.get(r.group_id);
    if (!entry) {
      entry = {
        group_id: r.group_id,
        group_name: r.group_name,
        subject_id: r.subject_id,
        subject_name: r.subject_name,
        scheme_status: r.scheme_status,
        scheme_description: r.scheme_description,
        components: [],
        total: 0,
        max_total: 0,
        grades_count: 0,
      };
      byGroup.set(r.group_id, entry);
    }
    if (r.component_id !== null) {
      const count = Number(r.cnt ?? 0);
      const earned = r.earned === null || r.earned === undefined ? null : round1(Number(r.earned));
      entry.components.push({
        id: r.component_id,
        name: r.component_name as string,
        max_score: Number(r.max_score),
        is_exam: Boolean(r.is_exam),
        earned,
        count,
      });
      entry.max_total += Number(r.max_score);
      entry.grades_count += count;
      if (earned !== null) entry.total += earned;
    }
  }

  return [...byGroup.values()].map((g) => ({ ...g, total: round1(g.total) }));
}

export interface ComponentForGroup {
  id: number;
  name: string;
  max_score: number;
}

// Komponent shu guruh fani mezoniga tegishli va mezon e'lon qilinganini tekshiradi.
export async function getPublishedComponentForGroup(componentId: number, groupId: number): Promise<ComponentForGroup> {
  const rows = await query<ComponentForGroup & { status: 'draft' | 'published' }>(
    `SELECT c.id, c.name, c.max_score, sc.status
     FROM grading_components c
     JOIN grading_schemes sc ON sc.id = c.scheme_id
     JOIN \`groups\` g ON g.subject_id = sc.subject_id
     WHERE c.id = ? AND g.id = ?`,
    [componentId, groupId]
  );
  if (!rows.length) throw new ApiError(400, "Tanlangan mezon bu guruh faniga tegishli emas");
  if (rows[0].status !== 'published') {
    throw new ApiError(409, "Baholash mezoni hali e'lon qilinmagan. Administrator mezonni e'lon qilgach baho qo'yish mumkin");
  }
  return { id: rows[0].id, name: rows[0].name, max_score: Number(rows[0].max_score) };
}

export function assertScoreWithinMax(score: number, component: ComponentForGroup) {
  if (score > component.max_score) {
    throw new ApiError(400, `"${component.name}" uchun ball ${component.max_score} dan oshmasligi kerak`);
  }
}
