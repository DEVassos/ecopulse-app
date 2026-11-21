import { Link } from 'react-router';
import type { Insight, InsightKind } from '../utils/insights';
import { signedGrams } from '../utils/insights';

/** Tipo do achado em cor e texto, nunca só na cor (RNF01): o símbolo é decoração, o rótulo é lido. */
const KIND: Record<InsightKind, { label: string; icon: string; tone: string }> = {
  alerta: { label: 'Alerta', icon: '▲', tone: 'text-warning border-warning/50' },
  oportunidade: { label: 'Oportunidade', icon: '◆', tone: 'text-primary-hover border-primary/50' },
  contexto: { label: 'Contexto', icon: '●', tone: 'text-secondary border-secondary/50' },
};

const PILL = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-surface px-2 py-px text-xs font-semibold';

interface Props {
  insight: Insight;
  /** "O que fazer" leva à tela onde agir, já no período do relatório; null quando não há tela. */
  link: { to: string; label: string } | null;
}

/** Um achado do relatório (#403): tipo, impacto em CO₂e, o achado numa frase, a evidência, a causa e o que fazer. */
export default function InsightCard({ insight, link }: Props) {
  const kind = KIND[insight.kind];
  const titleId = `achado-${insight.id}`;
  return (
    <article className="insight flex flex-col gap-2.5 rounded-xl border border-border bg-surface-2 p-4" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          <span className={`${PILL} ${kind.tone}`}>
            <span aria-hidden="true">{kind.icon}</span>
            {kind.label}
          </span>
          {insight.topic === 'confianca' && (
            <span className={`${PILL} border-border text-[var(--text-2)]`}>
              <span aria-hidden="true">◌</span>
              Confiança dos dados
            </span>
          )}
        </div>
        {insight.impactGrams !== null && (
          <span className="text-xs text-muted">
            impacto <b className="font-data text-sm text-text">{signedGrams(insight.impactGrams)}</b> CO₂e
          </span>
        )}
      </div>
      <h3 id={titleId} className="m-0 font-display text-base font-semibold leading-snug">
        {insight.title}
      </h3>
      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-4 gap-y-1.5">
        {insight.evidence.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-muted">{item.label}</dt>
            <dd className="m-0 font-data text-sm">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-sm text-[var(--text-2)]">{insight.cause}</p>
      {insight.caveats.map((caveat) => (
        <p key={caveat} className="m-0 text-sm text-muted">
          Ressalva: {caveat}
        </p>
      ))}
      <p className="m-0 border-t border-border pt-2 text-sm">
        <strong>O que fazer:</strong> {insight.action}
        {link && (
          <>
            {' '}
            <Link to={link.to} className="report__no-print">
              {link.label}
            </Link>
          </>
        )}
      </p>
    </article>
  );
}
