import app from './app';
import { pool } from './config/db';
import { env } from './config/env';

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log(`MySQL ga ulandi (${env.db.host}:${env.db.port}/${env.db.database})`);
  } catch (err) {
    console.error("MySQL ga ulanib bo'lmadi:", (err as Error).message);
    console.error(".env dagi DB_* qiymatlarini va `npm run db:setup` bajarilganini tekshiring");
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`Server http://localhost:${env.port} da ishlayapti`);
  });
}

start();
