import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

// Barcha seed foydalanuvchilarining paroli
const PASSWORD = 'Parol123';

async function main() {
  const writeSeed = process.argv.includes('--write-seed');
  const dbDir = path.join(__dirname, '..', 'database');
  const schema = fs.readFileSync(path.join(dbDir, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(dbDir, 'seed.sql'), 'utf8');

  const hash = await bcrypt.hash(PASSWORD, 10);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    console.log('Jadvallar yaratilmoqda (schema.sql)...');
    await conn.query(schema);

    console.log('Namunaviy ma\'lumotlar yuklanmoqda (seed.sql)...');
    // @pw sessiya o'zgaruvchisi seed.sql dagi INSERT'lar uchun hash qiymatini beradi
    await conn.query(`SET @pw = ${conn.escape(hash)};\n${seed}`);

    console.log(`Tayyor. Barcha foydalanuvchilar paroli: ${PASSWORD}`);
  } finally {
    await conn.end();
  }

  if (writeSeed) {
    const out = path.join(dbDir, 'seed.standalone.sql');
    fs.writeFileSync(out, `USE oquv_markaz;\nSET @pw = '${hash}';\n${seed}`);
    console.log(`Mustaqil seed fayli yozildi: ${out}`);
  }
}

main().catch((err) => {
  console.error('Xatolik:', err.message);
  process.exit(1);
});
