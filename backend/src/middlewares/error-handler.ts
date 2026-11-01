import type { ErrorRequestHandler } from 'express';
import { AppError, ValidationError } from '../shared/errors';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) { next(error); return; }
  const invalidJson = error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
  const failure = invalidJson ? new ValidationError('JSON inválido no corpo da requisição.') : error;
  if (failure instanceof AppError) {
    res.status(failure.httpStatus).json({ error: { code: failure.code, message: failure.message } });
    return;
  }
  console.error('Erro interno ao processar requisição.');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
};
