import { Router } from 'express';
import { documentInputSchema, type DocumentInput } from '@prdforge/shared';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { documentService } from './service.js';
const id = (value: string | string[] | undefined) => {
  if (typeof value !== 'string') throw new Error('ID tidak valid');
  return value;
};
export function createDocumentsRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get('/', async (req, res) =>
    res.json({ documents: await documentService.list(req.userId!) }),
  );
  router.post('/', validateBody(documentInputSchema), async (req, res) =>
    res
      .status(201)
      .json({ document: await documentService.create(req.userId!, req.body as DocumentInput) }),
  );
  router.get('/:id', async (req, res) =>
    res.json({ document: await documentService.get(req.userId!, id(req.params.id)) }),
  );
  router.patch('/:id', async (req, res) =>
    res.json({
      document: await documentService.update(
        req.userId!,
        id(req.params.id),
        req.body as { title?: string; status?: 'draft' | 'review' | 'final' | 'archived' },
      ),
    }),
  );
  router.delete('/:id', async (req, res) => {
    await documentService.remove(req.userId!, id(req.params.id));
    res.status(204).end();
  });
  return router;
}
