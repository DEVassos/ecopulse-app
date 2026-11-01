import type { RequestHandler } from 'express';

/**
 * Libera o dashboard (outra origem, ex.: http://localhost:5173) a chamar a API pelo navegador.
 * Só as origens configuradas em CORS_ORIGIN recebem o cabeçalho; as demais seguem bloqueadas pelo navegador.
 */
export function cors(allowedOrigins: readonly string[]): RequestHandler {
  const allowed = new Set(allowedOrigins);
  return (req, res, next) => {
    res.vary('Origin');
    const origin = req.headers.origin;
    if (!origin || !allowed.has(origin)) { next(); return; }
    res.setHeader('Access-Control-Allow-Origin', origin);
    if (req.method !== 'OPTIONS') { next(); return; }
    // Preflight: o navegador pergunta antes de enviar JSON ou o cabeçalho Authorization (login da #20)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
    res.status(204).end();
  };
}
