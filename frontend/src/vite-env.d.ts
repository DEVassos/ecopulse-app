/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Endereço base da API do backend, por exemplo http://localhost:3000. */
  readonly VITE_API_URL?: string;
  /** Intervalo da atualização automática do dashboard, em ms (padrão 30000, mínimo 5000). */
  readonly VITE_REFRESH_INTERVAL_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
