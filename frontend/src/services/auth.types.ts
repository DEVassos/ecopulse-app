// Contrato de POST /api/auth/login e GET /api/auth/me (docs/api.md, #20).

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  /** JWT assinado pelo backend; enviado em Authorization: Bearer. */
  token: string;
}

/** Usuário dono do token, como o backend leu no JWT. */
export interface CurrentUser {
  id: string;
  email: string;
}
