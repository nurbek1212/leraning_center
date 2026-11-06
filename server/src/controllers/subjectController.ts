import { execute, query } from '../config/db';
import { ApiError, asyncHandler, ListQuery, ok, paged } from '../utils/http';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.query as unknown as ListQuery;
  const like = `%${search}%`;

  const [{ total }] = await query<{ total: number }>(
    'SELECT COUNT(*) AS total FROM subjects WHERE name LIKE ? OR description LIKE ?',
    [like, like]
  );
  const items = await query(
    `SELECT id, name, description FROM subjects
     WHERE name LIKE ? OR description LIKE ?
     ORDER BY name LIMIT ? OFFSET ?`,
    [like, like, limit, (page - 1) * limit]
  );

  ok(res, paged(items, total, page, limit));
});

export const getOne = asyncHandler(async (req, res) => {
  const rows = await query('SELECT id, name, description FROM subjects WHERE id = ?', [
    Number(req.params.id),
  ]);
  if (!rows.length) throw new ApiError(404, 'Fan topilmadi');
  ok(res, rows[0]);
});

export const create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const result = await execute('INSERT INTO subjects (name, description) VALUES (?, ?)', [
    name,
    description || null,
  ]);
  ok(res, { id: result.insertId, name, description: description || null }, "Fan qo'shildi", 201);
});

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { name, description } = req.body;
  const result = await execute('UPDATE subjects SET name = ?, description = ? WHERE id = ?', [
    name,
    description || null,
    id,
  ]);
  if (!result.affectedRows) throw new ApiError(404, 'Fan topilmadi');
  ok(res, { id, name, description: description || null }, 'Fan yangilandi');
});

export const remove = asyncHandler(async (req, res) => {
  const result = await execute('DELETE FROM subjects WHERE id = ?', [Number(req.params.id)]);
  if (!result.affectedRows) throw new ApiError(404, 'Fan topilmadi');
  ok(res, null, "Fan o'chirildi");
});
