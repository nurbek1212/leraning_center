import mysql, { Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';
import { env } from './env';

export const pool: Pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  dateStrings: true, // DATE ustunlari 'YYYY-MM-DD' matn ko'rinishida qaytadi
  decimalNumbers: true, // AVG() kabi DECIMAL qiymatlar son sifatida qaytadi
});

type Executor = Pool | PoolConnection;

// SELECT so'rovlari uchun
export async function query<T = any>(
  sql: string,
  params: unknown[] = [],
  db: Executor = pool
): Promise<T[]> {
  const [rows] = await db.query(sql, params as any[]);
  return rows as T[];
}

// INSERT / UPDATE / DELETE so'rovlari uchun
export async function execute(
  sql: string,
  params: unknown[] = [],
  db: Executor = pool
): Promise<ResultSetHeader> {
  const [result] = await db.query(sql, params as any[]);
  return result as ResultSetHeader;
}

export async function transaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
