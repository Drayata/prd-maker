import { Router } from 'express';
import {
  providerInputSchema,
  providerPresets,
  providerUpdateSchema,
  type ProviderInput,
  type ProviderUpdate,
} from '@prdforge/shared';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { providerService } from './service.js';

export function createProvidersRouter() {
  const router = Router();
  const id = (value: string | string[] | undefined) => {
    if (typeof value !== 'string') throw new Error('ID provider tidak valid.');
    return value;
  };
  router.use(requireAuth);
  router.get('/presets', (_request, response) => response.json({ presets: providerPresets }));
  router.get('/', async (request, response) =>
    response.json({ providers: await providerService.list(request.userId!) }),
  );
  router.post('/', validateBody(providerInputSchema), async (request, response) =>
    response.status(201).json({
      provider: await providerService.create(request.userId!, request.body as ProviderInput),
    }),
  );
  router.post('/test-draft', validateBody(providerInputSchema), async (request, response) =>
    response.json(await providerService.testDraft(request.body as ProviderInput)),
  );
  router.get('/:id', async (request, response) =>
    response.json({ provider: await providerService.get(request.userId!, id(request.params.id)) }),
  );
  router.patch('/:id', validateBody(providerUpdateSchema), async (request, response) =>
    response.json({
      provider: await providerService.update(
        request.userId!,
        id(request.params.id),
        request.body as ProviderUpdate,
      ),
    }),
  );
  router.delete('/:id', async (request, response) => {
    await providerService.remove(request.userId!, id(request.params.id));
    response.status(204).end();
  });
  router.post('/:id/duplicate', async (request, response) =>
    response
      .status(201)
      .json({ provider: await providerService.duplicate(request.userId!, id(request.params.id)) }),
  );
  router.post('/:id/test', async (request, response) =>
    response.json(await providerService.test(request.userId!, id(request.params.id))),
  );
  router.get('/:id/models', async (request, response) =>
    response.json({ models: await providerService.models(request.userId!, id(request.params.id)) }),
  );
  return router;
}
