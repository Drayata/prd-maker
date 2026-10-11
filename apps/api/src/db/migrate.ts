import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './client.js';

const directory = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
await pool.query(
  'CREATE TABLE IF NOT EXISTS `_prdforge_migrations` (`name` varchar(255) PRIMARY KEY, `checksum` char(64) NOT NULL, `applied_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP)',
);
const [rows] = await pool.query('SELECT `name`, `checksum` FROM `_prdforge_migrations`');
const applied = new Map(
  (rows as { name: string; checksum: string }[]).map((row) => [row.name, row.checksum]),
);

for (const name of (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()) {
  const sql = await readFile(join(directory, name), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  if (applied.get(name) === checksum) continue;
  if (applied.has(name)) throw new Error(`Migrasi ${name} berubah setelah diterapkan.`);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const statement of sql
      .split(/;\s*(?:\n|$)/)
      .map((value) => value.trim())
      .filter(Boolean))
      await connection.query(statement);
    await connection.query(
      'INSERT INTO `_prdforge_migrations` (`name`, `checksum`) VALUES (?, ?)',
      [name, checksum],
    );
    await connection.commit();
    console.log(`Migrasi diterapkan: ${name}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
await pool.end();
