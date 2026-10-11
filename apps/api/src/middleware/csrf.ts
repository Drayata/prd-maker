import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export function requireTrustedOrigin(request: Request, _response: Response, next: NextFunction) {
  const origin = request.get('origin');
  if (origin && origin !== env.WEB_ORIGIN)
    return next(new AppError(403, 'ORIGIN_FORBIDDEN', 'Origin permintaan tidak diizinkan.'));
  next();
}
