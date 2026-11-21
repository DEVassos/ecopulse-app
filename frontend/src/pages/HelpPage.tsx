import { useSearchParams } from 'react-router';
import AppHeader from '../components/AppHeader';
import HelpAdmin from '../components/HelpAdmin';
import HelpFormulas from '../components/HelpFormulas';
import HelpReading from '../components/HelpReading';
import HelpUsage from '../components/HelpUsage';
import Tabs from '../components/Tabs';
import { useAuth } from '../hooks/useAuth';
import { useMonitoring } from '../hooks/useMonitoring';
import { readTab } from '../utils/tabs';
import type { TabIds } from '../utils/tabs';

/** Abas na ordem da faixa; o id é o valor de `?aba=` no endereço. */
const HELP_TABS = ['como-usar', 'guia-de-leitura', 'formulas', 'administracao'] as const satisfies TabIds<string>;
type HelpTab = (typeof HELP_TABS)[number];

/**
 * Ajuda (#398, #404). A aba aberta mora na URL (`/ajuda?aba=formulas`): o link de uma aba pode ser enviado, e o
 * "voltar" do navegador desfaz a troca. Sem busca nem polling: o papel vem da sessão aberta no login (o mesmo do
 * cabeçalho) e o intervalo, do MonitoringProvider, que já o lê para todas as telas.
 */
export default function HelpPage() {
  const [params, setParams] = useSearchParams();
  const selected = readTab(HELP_TABS, params.get('aba'));
  const { user } = useAuth();
  const { refreshIntervalMs, settings } = useMonitoring();

  function select(tab: HelpTab) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('aba', tab);
      return next;
    });
  }

  const admin = (
    <HelpAdmin user={user} refreshSeconds={Math.round(refreshIntervalMs / 1000)} allowedSeconds={settings?.allowedIntervalsSeconds ?? null} />
  );

  return (
    <div className="page">
      <AppHeader />

      <main id="conteudo" tabIndex={-1} className="content">
        <section className="panel p-4 sm:p-6" aria-labelledby="ajuda-titulo">
          <h1 id="ajuda-titulo" className="m-0 font-display text-2xl font-semibold">Ajuda</h1>
          <p className="mt-2 mb-4 text-muted">Como usar o EcoPulse, como ler os números, como eles são calculados e quem altera o quê.</p>
          <Tabs<HelpTab>
            label="Seções da ajuda"
            selected={selected}
            onSelect={select}
            tabs={[
              { id: 'como-usar', label: 'Como usar', panel: <HelpUsage /> },
              { id: 'guia-de-leitura', label: 'Guia de leitura', panel: <HelpReading /> },
              { id: 'formulas', label: 'Fórmulas', panel: <HelpFormulas /> },
              { id: 'administracao', label: 'Administração', panel: admin },
            ]}
          />
        </section>
      </main>
    </div>
  );
}
