import 'dotenv/config';
import pg from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://album:album@localhost:5432/album',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const { rows } = await client.query('SELECT filename FROM migrations ORDER BY filename');
    const applied = new Set(rows.map((r) => r.filename));

    const dir = join(__dirname, 'migrations');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`);
        continue;
      }
      const sql = await readFile(join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✓     ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    if (ran === 0) console.log('  Nada nuevo que aplicar.');
    else console.log(`\n  ${ran} migración(es) aplicada(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('Error en migración:', err.message);
  process.exit(1);
});
