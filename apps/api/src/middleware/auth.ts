import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return next(new AppError(401, 'UNAUTHORIZED', 'Silakan masuk terlebih dahulu.'));
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    if (typeof payload === 'string' || typeof payload.sub !== 'string')
      throw new Error('Payload tidak valid');
    request.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, 'ACCESS_TOKEN_INVALID', 'Sesi tidak valid atau sudah berakhir.'));
  }
}
