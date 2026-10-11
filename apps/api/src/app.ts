import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { API_PREFIX } from './config/constants.js';
import { env } from './config/env.js';
import { checkDatabase } from './db/client.js';
import { errorHandler } from './middleware/error.js';
import { logger } from './lib/logger.js';
import { createAuthRouter } from './modules/auth/routes.js';
import type { AuthService } from './modules/auth/service.js';

export function createApp(dependencies?: { authService?: AuthService }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get(`${API_PREFIX}/health`, async (_request, response) => {
    const database = (await checkDatabase()) ? 'ok' : 'unavailable';
    response.status(database === 'ok' ? 200 : 503).json({
      status: database === 'ok' ? 'ok' : 'degraded',
      app: 'ok',
      database,
      timestamp: new Date().toISOString(),
    });
  });
  app.use(`${API_PREFIX}/auth`, createAuthRouter(dependencies?.authService));
  app.use((_request, response) =>
    response
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan.' } }),
  );
  app.use(errorHandler);
  return app;
}
