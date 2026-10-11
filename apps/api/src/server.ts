import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db/client.js';
import { logger } from './lib/logger.js';

const server = createApp().listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API siap menerima koneksi');
});

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Memulai graceful shutdown');
  server.close((error) => {
    void pool.end().then(() => {
      if (error) logger.error({ error }, 'Gagal menutup server');
      process.exit(error ? 1 : 0);
    });
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
