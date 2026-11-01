import { useCallback, useEffect, useRef, useState } from 'react';

/** Tarefa repetida pelo polling; deve tratar os próprios erros e respeitar o `signal`. */
export type PollingTask = (signal: AbortSignal) => Promise<void>;

/**
 * Executa `task` ao montar e depois a cada `intervalMs`, sem recarregar a página (RF11, RNF02).
 * - A próxima execução só é agendada quando a anterior termina (sem requisições sobrepostas).
 * - Com a aba oculta o polling pausa; ao voltar, busca na hora.
 * - Ao desmontar, limpa o timer e cancela a requisição pendente (AbortController).
 */
export function usePolling(task: PollingTask, intervalMs: number): { refresh: () => void } {
  // Sempre a versão mais recente da tarefa, sem reiniciar o ciclo a cada render
  const taskRef = useRef(task);
  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  // Incrementar reinicia o ciclo: cancela o que estiver em andamento e busca na hora
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let timer: number | undefined;
    let controller: AbortController | null = null;
    let stopped = false;

    async function run() {
      window.clearTimeout(timer);
      controller?.abort();
      const current = new AbortController();
      controller = current;

      try {
        await taskRef.current(current.signal);
      } finally {
        // Agenda a próxima mesmo se a tarefa rejeitar: o erro segue para o console, mas o polling não para
        if (!stopped && !current.signal.aborted && !document.hidden) {
          timer = window.setTimeout(run, intervalMs);
        }
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        window.clearTimeout(timer);
        controller?.abort();
      } else {
        void run();
      }
    }

    void run();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs, cycle]);

  const refresh = useCallback(() => setCycle((current) => current + 1), []);

  return { refresh };
}
