import type { AuthUser } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../services/auth.types';
import type { UserRole } from '../services/auth.types';

interface Props {
  /** Conta da sessão, como o backend devolveu no login; null no modo demonstração, que não tem login. */
  user: AuthUser | null;
  /** Intervalo da atualização automática em uso agora, em segundos. */
  refreshSeconds: number;
  /** Valores aceitos pelo backend (GET /monitoring-settings); null antes da resposta ou sem backend. */
  allowedSeconds: readonly number[] | null;
}

/** O que o papel da sessão permite, dito para a própria pessoa. */
const ROLE_SCOPE: Record<UserRole, string> = {
  admin: 'Sua conta consulta todas as telas e, na Configuração, altera o intervalo de atualização e convida pessoas.',
  usuario: 'Sua conta consulta todas as telas e vê a Configuração só para leitura. Para mudar o intervalo ou convidar alguém, peça a um administrador.',
};

type Who = 'admin' | 'both' | 'nobody';

/** Quem altera, em texto e em cor: a cor nunca é a única pista. */
const WHO: Record<Who, { label: string; className: string }> = {
  admin: { label: 'Só o administrador', className: 'border-primary/50 bg-primary/10 text-primary' },
  both: { label: 'Os dois papéis', className: 'border-border text-muted' },
  nobody: { label: 'Ninguém pela tela', className: 'border-border bg-surface-3 text-muted' },
};

/**
 * [item, onde e por quê] de cada grupo. Fatos do código: intervalos de `allowedIntervalsSeconds` (15/30/60 s no
 * backend), convite de uso único com validade de `INVITATION_TTL_HOURS` (72 h no padrão), cache de 1 h da Carbon API
 * e descoberta dos serviços no agregador.
 */
function itemsOf(interval: string): Record<Who, Array<[string, string]>> {
  return {
    admin: [
      [`Intervalo de atualização da tela (${interval})`, 'Em Configuração › Parâmetros do monitoramento. É de quanto em quanto tempo o navegador busca dados novos, e vale para todos a partir do ciclo seguinte. Não muda a coleta, que segue o intervalo que o agregador informa para cada serviço.'],
      ['Convidar pessoas e escolher o papel', 'Em Configuração › Convidar pessoa, como Usuário ou Administrador. O link serve para um cadastro só e expira em 72 h no padrão do servidor; a tela mostra a validade ao gerar. Não há cadastro aberto: só entra quem foi convidado.'],
    ],
    both: [
      ['Consultar todas as telas', 'Dashboard, Emissões, Comparação, Configuração e esta Ajuda. Para o usuário, a Configuração é só leitura.'],
      ['Baixar e imprimir', 'O CSV das coletas e o relatório em PDF da página Emissões.'],
    ],
    nobody: [
      ['Coeficientes do modelo de potência', 'Os pesos de CPU, memória, disco e rede são fixos no cálculo, iguais para todos os serviços, para os números serem comparáveis entre serviços e ao longo do tempo.'],
      ['Intensidade de carbono das regiões', 'Vem da Carbon API, com cache de 1 h por região; o fator usado fica gravado em cada coleta.'],
      ['Lista de serviços monitorados', 'Descoberta automática no agregador de métricas: serviço novo entra sozinho, e o que sai fica como Removido, com o histórico.'],
      ['Papel de uma conta já criada', 'Definido no convite.'],
    ],
  };
}

/** Aba "Administração" da Ajuda (#398): o papel da sessão e quem altera o quê, com o motivo. */
export default function HelpAdmin({ user, refreshSeconds, allowedSeconds }: Props) {
  // "15, 30 ou 60 s; agora, a cada 30 s", ou só o intervalo em uso sem a lista do backend
  const values = allowedSeconds ?? [];
  const choices = values.length > 1 ? `${values.slice(0, -1).join(', ')} ou ${values[values.length - 1]} s; ` : values.length === 1 ? `${values[0]} s; ` : '';
  const items = itemsOf(`${choices}agora, a cada ${refreshSeconds} s`);

  return (
    <div className="grid gap-6">
      <section aria-labelledby="ajuda-sessao" className="rounded-lg border border-border bg-surface-2 p-4">
        <h2 id="ajuda-sessao" className="m-0 text-sm font-normal text-muted">Sua sessão</h2>
        {user ? (
          <>
            <p className="m-0 mt-1 text-lg">Papel: <strong>{ROLE_LABELS[user.role]}</strong></p>
            <p className="m-0 mt-1 break-all text-sm text-muted">{user.name} · {user.email}</p>
            <p className="m-0 mt-2 text-sm">{ROLE_SCOPE[user.role]}</p>
          </>
        ) : (
          <p className="m-0 mt-1 text-sm">
            Modo demonstração: não há sessão nem papel. Com o backend no ar, cada pessoa entra com a conta e o papel do convite.
          </p>
        )}
      </section>

      <section aria-labelledby="ajuda-quem-altera" className="grid gap-3">
        <h2 id="ajuda-quem-altera" className="m-0 font-display text-lg font-semibold">Quem altera o quê</h2>
        <p className="m-0 text-sm text-muted">
          Há dois papéis: o <strong className="text-text">Usuário</strong> consulta; o <strong className="text-text">Administrador</strong>{' '}
          também altera a configuração e convida pessoas.
        </p>
        <div className="grid gap-4 lg:grid-cols-3">
          {(Object.keys(WHO) as Who[]).map((who) => (
            <section key={who} aria-labelledby={`ajuda-quem-${who}`} className="grid content-start gap-3 rounded-lg border border-border p-4">
              <h3 id={`ajuda-quem-${who}`} className="m-0">
                <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${WHO[who].className}`}>
                  {WHO[who].label}
                </span>
              </h3>
              {who === 'admin' && user && (
                <p className="m-0 text-sm font-semibold">
                  {user.role === 'admin' ? 'Sua conta altera estes itens.' : 'Sua conta não altera estes itens.'}
                </p>
              )}
              <ul className="m-0 grid list-none gap-3 p-0">
                {items[who].map(([title, text]) => (
                  <li key={title} className="text-sm leading-relaxed">
                    <strong className="block">{title}</strong>
                    <span className="text-muted">{text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="m-0 text-sm text-muted">
          Quem garante os papéis é o servidor, não a tela: o backend recusa (403) qualquer alteração pedida por uma conta
          Usuário, mesmo fora da interface.
        </p>
      </section>
    </div>
  );
}
