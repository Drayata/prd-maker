import { Router } from 'express';
import { clarificationRequestSchema, type ClarificationRequest } from '@prdforge/shared';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { generateService } from './service.js';
const id = (value: string | string[] | undefined) => {
  if (typeof value !== 'string') throw new Error('ID tidak valid');
  return value;
};
export function createGenerateRouter() {
  const router = Router();
  router.use(requireAuth);
  router.post('/clarifying-questions', validateBody(clarificationRequestSchema), async (req, res) =>
    res.json(await generateService.clarifications(req.userId!, req.body as ClarificationRequest)),
  );
  router.post('/documents/:id/generate', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    const emit = (event: string, data: unknown) =>
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const heartbeat = setInterval(() => res.write(':ping\n\n'), 15000);
    try {
      await generateService.generateDocument(
        req.userId!,
        id(req.params.id),
        controller.signal,
        emit,
      );
    } finally {
      clearInterval(heartbeat);
      res.end();
    }
  });
  return router;
}
