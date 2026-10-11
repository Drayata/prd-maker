import { Router } from 'express';
import { templateInputSchema, type TemplateInput } from '@prdforge/shared';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { templateService } from './service.js';
const id = (value: string | string[] | undefined) => {
  if (typeof value !== 'string') throw new Error('ID tidak valid');
  return value;
};
export function createTemplatesRouter() {
  const router = Router();
  router.use(requireAuth);
  router.get('/', async (req, res) =>
    res.json({ templates: await templateService.list(req.userId!) }),
  );
  router.post('/', validateBody(templateInputSchema), async (req, res) =>
    res
      .status(201)
      .json({ template: await templateService.create(req.userId!, req.body as TemplateInput) }),
  );
  router.patch('/:id', async (req, res) =>
    res.json({
      template: await templateService.update(
        req.userId!,
        id(req.params.id),
        req.body as Partial<TemplateInput>,
      ),
    }),
  );
  router.delete('/:id', async (req, res) => {
    await templateService.remove(req.userId!, id(req.params.id));
    res.status(204).end();
  });
  router.post('/:id/duplicate', async (req, res) =>
    res
      .status(201)
      .json({ template: await templateService.duplicate(req.userId!, id(req.params.id)) }),
  );
  return router;
}
