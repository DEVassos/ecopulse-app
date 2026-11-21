export class AppError extends Error {
  constructor(public readonly code: string, public readonly httpStatus: number, message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) { super('VALIDATION_ERROR', 400, message); }
}

export class NotFoundError extends AppError {
  constructor(message = 'Rota não encontrada.') { super('NOT_FOUND', 404, message); }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Credenciais inválidas.') { super('UNAUTHORIZED', 401, message); }
}

/** Sessão válida, mas o papel não permite a ação (ex.: conta `usuario` tentando convidar). */
export class ForbiddenError extends AppError {
  constructor(message = 'Só administradores podem fazer esta ação.') { super('FORBIDDEN', 403, message); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super('CONFLICT', 409, message); }
}

/** O recurso existiu, mas não pode mais ser usado (convite usado ou expirado). */
export class GoneError extends AppError {
  constructor(message: string) { super('GONE', 410, message); }
}

export class DatabaseError extends AppError {
  constructor() {
    super('DATABASE_ERROR', 500, 'Não foi possível acessar o banco de dados.');
  }
}

/** API auxiliar (agregador de métricas, intensidade de carbono) fora do ar, lenta demais ou com resposta inválida. */
export class ExternalApiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super('EXTERNAL_API_ERROR', 502, message);
    this.cause = cause;
  }
}
