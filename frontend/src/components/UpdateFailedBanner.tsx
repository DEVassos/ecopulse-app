import { formatTime } from '../utils/format';

interface Props {
  /** Mensagem da última falha, como o hook entrega; vazia quando a última busca deu certo. */
  message: string;
  /** Horário dos dados na tela: a última busca bem-sucedida (ISO 8601). */
  updatedAt: string | null;
  onRetry: () => void;
}

/**
 * Falha de atualização com dados na tela (RF11): faixa compacta laranja, coerente com o selo "Desatualizado desde…",
 * e a tabela continua visível. Sem nenhum dado, quem aparece é o ErrorState.
 * A região viva (role="status") fica montada enquanto há dados, mesmo sem falha: o leitor de tela anuncia o texto uma
 * vez, quando ele aparece, e não a cada ciclo do polling. Ela é sr-only e fica fora do fluxo, sem abrir espaço na página.
 */
export default function UpdateFailedBanner({ message, updatedAt, onRetry }: Props) {
  // A mensagem vem do hook: "Não foi possível conectar…" quando a rede cai, a do corpo do erro num 500
  const sentence = /[.!?]$/.test(message) ? message : `${message}.`;
  const dataTime = updatedAt ? formatTime(updatedAt) : '';
  const failed = message !== '' && dataTime !== '';

  return (
    <>
      <p role="status" className="sr-only">
        {failed ? `${sentence} Mostrando dados de ${dataTime}.` : ''}
      </p>
      {failed && (
        <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-warning/50 bg-warning/10 px-4 py-1 text-sm">
          {/* O texto visível repete o da região viva: escondido do leitor de tela para não ser lido duas vezes */}
          <span className="flex items-center gap-2" aria-hidden="true">
            <span className="size-2 shrink-0 rounded-full bg-warning" />
            <span>
              {sentence} Mostrando dados de <strong className="font-mono font-medium text-warning">{dataTime}</strong>.
            </span>
          </span>
          <button type="button" onClick={onRetry} className="btn-outline ml-auto h-7 px-3 text-xs">
            Tentar novamente
          </button>
        </div>
      )}
    </>
  );
}
