import type { PoolConnection } from 'mysql2/promise';
import { execute } from '../config/db';

// Fan nomini tozalaydi: ortiqcha bo'sh joylar olib tashlanadi
export const normalizeSubjectName = (name: string) => name.trim().replace(/\s+/g, ' ');

// Fan nomi bo'yicha id ni qaytaradi; fan yo'q bo'lsa avtomatik yaratadi.
// subjects.name UNIQUE (kichik/katta harfga e'tiborsiz), shuning uchun "matematika" va "Matematika" bitta fan.
// ON DUPLICATE KEY ... LAST_INSERT_ID(id) parallel so'rovlarda ham xavfsiz.
export async function findOrCreateSubject(name: string, conn: PoolConnection): Promise<number> {
  const clean = normalizeSubjectName(name);
  const result = await execute(
    'INSERT INTO subjects (name) VALUES (?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
    [clean],
    conn
  );
  return result.insertId;
}

// Nomlar ro'yxati uchun: takrorlar (kichik/katta harfdan qat'i nazar) olib tashlanadi
export function uniqueSubjectNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of names) {
    const clean = normalizeSubjectName(raw);
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result;
}
