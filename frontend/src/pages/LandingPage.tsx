import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import AuthBackdrop from '../components/AuthBackdrop';
import Brand from '../components/Brand';
import { metricIconProps } from '../components/MetricTile';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../hooks/useAuth';
import { isDemoMode } from '../services/services.service';
import type { LoginRedirectState } from '../utils/login-redirect';
import './LandingPage.css';

/** Ícone de linha 24×24 com o traço dos cards do painel: emoji não serve de ícone (identidade-visual.md, #258). */
function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <svg {...metricIconProps} aria-hidden="true">
      {children}
    </svg>
  );
}

/** Destaques da plataforma: só o que já está implementado (README). */
const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
    title: 'Energia e CO₂e em 24 h',
    text: 'Compare com as 24 h anteriores e veja a tendência na hora.',
  },
  {
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
    title: 'Carbono por região',
    text: 'O fator de carbono da matriz elétrica entra no cálculo de cada serviço.',
  },
  {
    icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    title: 'Ranking de impacto',
    text: 'Descubra quais serviços mais pesam na pegada de carbono da empresa.',
  },
  {
    icon: <path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7Zm14 0-3 7a3 3 0 0 0 6 0l-3-7ZM8 21h8" />,
    title: 'Comparação lado a lado',
    text: 'Coloque de 2 a 10 serviços frente a frente e compare consumo e emissões.',
  },
  {
    icon: <path d="M3 3v18h18M7 15l4-4 3 3 6-6" />,
    title: 'Histórico de emissões',
    text: 'Gráficos por período para acompanhar a evolução de cada serviço.',
  },
  {
    icon: <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8M21 3v5h-5" />,
    title: 'Atualização automática',
    text: 'O painel se atualiza sozinho, no intervalo que você configurar.',
  },
];

/** Como a métrica de infraestrutura vira pegada de carbono (docs/calculos.md). */
const STEPS = [
  { title: 'Coleta', text: 'CPU, memória, disco e rede de cada aplicação e microsserviço.' },
  { title: 'Energia', text: 'As métricas viram consumo estimado de energia, em kWh.' },
  { title: 'Carbono', text: 'A energia vezes a intensidade de carbono da região vira gCO₂e.' },
];

/** Ranking da prévia: dados ilustrativos, só para mostrar o painel. */
const PREVIEW_RANKING = [
  { name: 'api-pagamentos', value: 82 },
  { name: 'auth-service', value: 61 },
  { name: 'relatorios-batch', value: 44 },
  { name: 'notificacoes', value: 23 },
];

/** Intervalo entre os pulsos do logo na apresentação (a animação dura 2,4 s, ver Brand.tsx). */
const PULSE_EVERY_MS = 5000;
/** Primeiro pulso logo depois de a página abrir, para o visitante ver a animação sem esperar. */
const FIRST_PULSE_MS = 900;

/**
 * Pulso do logo de tempo em tempo: aqui não há atualização de dados para disparar o Brand, então um contador faz o
 * papel do `pulseKey`. Com `prefers-reduced-motion` o próprio Brand ignora a troca e o logo fica parado.
 */
function useLogoPulse(): string | null {
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    let interval: number | undefined;
    const first = window.setTimeout(() => {
      setBeat((value) => value + 1);
      interval = window.setInterval(() => setBeat((value) => value + 1), PULSE_EVERY_MS);
    }, FIRST_PULSE_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, []);

  return beat > 0 ? String(beat) : null;
}

/** Página de apresentação, aberta sem sessão: chamada, prévia do painel e recursos. */
export default function LandingPage() {
  const { user } = useAuth();
  const pulseKey = useLogoPulse();
  // Com sessão (ou no modo demonstração, que abre sem login) o botão leva direto ao painel
  const canOpenPanel = Boolean(user) || isDemoMode;
  const loginState: LoginRedirectState = { from: '/' };
  const panelLink = canOpenPanel
    ? { to: '/', label: 'Ir para o painel' }
    : { to: '/login', label: 'Entrar no painel', state: loginState };

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link to="/inicio" className="landing-brand" aria-label="EcoPulse — página inicial">
            <Brand pulseKey={pulseKey} />
          </Link>
          <nav className="landing-nav" aria-label="Seções da página">
            <a href="#demonstracao">Demonstração</a>
            <a href="#recursos">Recursos</a>
          </nav>
          <div className="landing-header-actions">
            <ThemeToggle />
            <Link className="landing-btn landing-btn--small" to={panelLink.to} state={panelLink.state}>
              {canOpenPanel ? 'Painel' : 'Entrar'}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Chamada principal */}
        <section className="landing-hero" aria-labelledby="landing-title">
          {/* O mesmo vídeo em looping do login (#436), só atrás da chamada; some com menos movimento */}
          <AuthBackdrop />
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">
                <span className="landing-live" aria-hidden="true" />
                GreenOps · observabilidade socioambiental
              </p>
              <h1 id="landing-title">
                O impacto ambiental do seu software, <span>finalmente visível.</span>
              </h1>
              <p className="landing-lead">
                O EcoPulse transforma métricas de CPU, memória, disco e rede em consumo de energia (kWh) e pegada de
                carbono (gCO₂e), usando a matriz elétrica de cada região onde seus serviços rodam.
              </p>
              <div className="landing-ctas">
                <Link className="landing-btn" to={panelLink.to} state={panelLink.state}>
                  {panelLink.label}
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <a className="btn-outline landing-btn-outline" href="#demonstracao">
                  Ver demonstração
                </a>
              </div>
              <p className="landing-note">Valores estimados a partir da intensidade de carbono de cada região.</p>
            </div>

            {/* Fluxo métrica → energia → carbono, só ilustração */}
            <div className="landing-flow" aria-hidden="true">
              <div className="landing-flow-card">
                <span className="landing-flow-label">Infraestrutura</span>
                <div className="landing-flow-chips">
                  <span>CPU</span>
                  <span>Memória</span>
                  <span>Disco</span>
                  <span>Rede</span>
                </div>
              </div>
              <svg className="landing-flow-line" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M0 20 H70 L80 12 L90 20 L102 4 L114 36 L126 20 H200" />
                <path className="landing-flow-pulse" pathLength={1} d="M0 20 H70 L80 12 L90 20 L102 4 L114 36 L126 20 H200" />
              </svg>
              <div className="landing-flow-card">
                <span className="landing-flow-label">Energia</span>
                <strong className="landing-flow-value landing-flow-value--energy">
                  128,4 <small>kWh</small>
                </strong>
              </div>
              <svg className="landing-flow-line" viewBox="0 0 200 40" preserveAspectRatio="none">
                <path d="M0 20 H70 L80 12 L90 20 L102 4 L114 36 L126 20 H200" />
                <path className="landing-flow-pulse landing-flow-pulse--late" pathLength={1} d="M0 20 H70 L80 12 L90 20 L102 4 L114 36 L126 20 H200" />
              </svg>
              <div className="landing-flow-card landing-flow-card--highlight">
                <span className="landing-flow-label">Pegada de carbono</span>
                <strong className="landing-flow-value">
                  52,7 <small>kg CO₂e</small>
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* Prévia do painel */}
        <section id="demonstracao" className="landing-section" aria-labelledby="demo-title">
          <div className="landing-container">
            <div className="landing-section-head">
              <p className="landing-kicker">Demonstração</p>
              <h2 id="demo-title">Do servidor ao relatório, em um só painel</h2>
              <p>Gestores de TI e de sustentabilidade enxergam, serviço por serviço, quanto cada aplicação gasta e emite.</p>
            </div>

            <div className="landing-demo">
              <ol className="landing-steps">
                {STEPS.map((step, index) => (
                  <li key={step.title}>
                    <span className="landing-step-number">{index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <figure className="landing-preview panel">
                <figcaption className="landing-preview-head">
                  <span>Visão geral · últimas 24 h</span>
                  <span className="landing-preview-tag">Dados ilustrativos</span>
                </figcaption>
                <div className="landing-preview-kpis">
                  <div className="landing-kpi">
                    <span>Energia</span>
                    <strong className="font-data">128,4 kWh</strong>
                    <em className="landing-delta landing-delta--down">▼ 6,2% vs. 24 h anteriores</em>
                  </div>
                  <div className="landing-kpi">
                    <span>CO₂e estimado</span>
                    <strong className="font-data">52,7 kg</strong>
                    <em className="landing-delta landing-delta--up">▲ 3,1% vs. 24 h anteriores</em>
                  </div>
                </div>
                <svg className="landing-preview-chart" viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">
                  <path className="landing-chart-area" d="M0 60 L25 52 L50 56 L75 40 L100 44 L125 30 L150 36 L175 22 L200 28 L225 18 L250 26 L275 14 L300 20 V80 H0 Z" />
                  <path className="landing-chart-line" d="M0 60 L25 52 L50 56 L75 40 L100 44 L125 30 L150 36 L175 22 L200 28 L225 18 L250 26 L275 14 L300 20" />
                </svg>
                <div className="landing-ranking">
                  <span className="landing-ranking-title">Quem mais pesa no CO₂e</span>
                  {PREVIEW_RANKING.map((item) => (
                    <div key={item.name} className="landing-ranking-row">
                      <span>{item.name}</span>
                      <span className="landing-ranking-bar">
                        <span style={{ width: `${item.value}%` }} />
                      </span>
                    </div>
                  ))}
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* Recursos */}
        <section id="recursos" className="landing-section landing-section--alt" aria-labelledby="features-title">
          <div className="landing-container">
            <div className="landing-section-head">
              <p className="landing-kicker">Recursos</p>
              <h2 id="features-title">Tudo o que você precisa para medir o que importa</h2>
            </div>
            <ul className="landing-features">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="panel">
                  <span className="landing-feature-icon">
                    <FeatureIcon>{feature.icon}</FeatureIcon>
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Chamada final */}
        <section className="landing-section" aria-labelledby="cta-title">
          <div className="landing-container">
            <div className="landing-cta panel">
              <h2 id="cta-title">Software não consome energia. O hardware que o executa, sim.</h2>
              <p>Comece a acompanhar a pegada de carbono das suas aplicações hoje.</p>
              <Link className="landing-btn" to={panelLink.to} state={panelLink.state}>
                {panelLink.label}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">EcoPulse · DEVassos · Fatec Jacareí 2DSM 2026-2</footer>
    </div>
  );
}
