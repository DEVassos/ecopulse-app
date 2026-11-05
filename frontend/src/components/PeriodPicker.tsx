import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  addMonths,
  dayLabel,
  formatDayCount,
  formatRange,
  isSelectable,
  keyTarget,
  monthLabel,
  monthOf,
  monthWeeks,
  ordered,
  periodLabel,
  presetOf,
  presets,
} from '../utils/calendar';
import { shiftInputDate, spanDays } from '../utils/emissions';
import './PeriodPicker.css';

interface Props {
  /** Período aplicado, em AAAA-MM-DD. */
  start: string;
  end: string;
  /** Hoje, em AAAA-MM-DD: nenhum dia depois dele pode ser escolhido. */
  today: string;
  /** Maior período aceito, contando os dois extremos. */
  maxDays: number;
  /** Período escolhido (atalho, ‹ › ou calendário), já em ordem. */
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
  /** Por que o seletor está desligado (tooltip), ex.: o tempo real fixa o período em hoje. */
  disabledReason?: string;
}

const WEEKDAYS: Array<[string, string]> = [
  ['seg', 'segunda-feira'],
  ['ter', 'terça-feira'],
  ['qua', 'quarta-feira'],
  ['qui', 'quinta-feira'],
  ['sex', 'sexta-feira'],
  ['sáb', 'sábado'],
  ['dom', 'domingo'],
];

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/**
 * Seletor de período (#273): uma pílula com o intervalo ativo e ‹ › para andar o período pelo próprio tamanho; ela abre
 * os atalhos (Hoje, Ontem, Últimos 7 e 30 dias) e o calendário de um mês, com a semana na segunda-feira. No calendário,
 * o primeiro clique marca o início e o segundo o fim; dias futuros e além de `maxDays` ficam desabilitados. Teclado:
 * setas movem o dia, Enter escolhe e Esc fecha. No celular, o painel abre de baixo para cima.
 */
export default function PeriodPicker({ start, end, today, maxDays, onChange, disabled = false, disabledReason }: Props) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'atalhos' | 'calendario'>('atalhos');
  // Calendário: o intervalo em escolha e, entre o primeiro e o segundo clique, o dia marcado primeiro
  const [range, setRange] = useState<[string, string]>([start, end]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [focusDay, setFocusDay] = useState(end);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);
  // Depois de abrir o calendário ou andar pelo teclado, o foco vai para o dia (e não fica no botão anterior)
  const focusGrid = useRef(false);
  const panelId = useId();

  const span = spanDays(start, end);
  const canGoBack = !disabled;
  const canGoForward = !disabled && shiftInputDate(end, span) <= today;
  const preset = presetOf(start, end, today);

  function close(returnFocus = true) {
    setOpen(false);
    setAnchor(null);
    setHoverDay(null);
    if (returnFocus) pillRef.current?.focus();
  }

  function choose(nextStart: string, nextEnd: string) {
    close();
    onChange(nextStart, nextEnd);
  }

  function shift(direction: -1 | 1) {
    onChange(shiftInputDate(start, span * direction), shiftInputDate(end, span * direction));
  }

  function openCalendar() {
    setRange([start, end]);
    setAnchor(null);
    setHoverDay(null);
    setFocusDay(end);
    setView('calendario');
    focusGrid.current = true;
  }

  function pick(day: string) {
    if (!isSelectable(day, today, anchor, maxDays)) return;
    if (anchor === null) {
      setAnchor(day);
      setRange([day, day]);
    } else {
      setRange(ordered(anchor, day));
      setAnchor(null);
    }
    setFocusDay(day);
  }

  function handleGridKey(event: KeyboardEvent<HTMLTableElement>) {
    const target = keyTarget(focusDay, event.key);
    if (target === null) return;
    event.preventDefault();
    // O foco não vai além de hoje: depois dele não há o que escolher
    const next = target > today ? today : target;
    setFocusDay(next);
    if (anchor !== null) setHoverDay(next);
    focusGrid.current = true;
  }

  // Ao abrir, o foco vai para o primeiro atalho
  useEffect(() => {
    if (open && view === 'atalhos') panelRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [open, view]);

  // No calendário, o foco acompanha o dia escolhido pelo teclado
  useEffect(() => {
    if (!open || view !== 'calendario' || !focusGrid.current) return;
    focusGrid.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [open, view, focusDay]);

  // Clique fora fecha, sem levar o foco de volta (ele vai para onde a pessoa clicou)
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
      setAnchor(null);
      setHoverDay(null);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const month = monthOf(focusDay);
  const canNextMonth = monthOf(addMonths(month, 1)) <= monthOf(today);
  // Com o início marcado, o intervalo acompanha o ponteiro (ou o foco) até o segundo clique
  const preview = anchor !== null && hoverDay !== null && isSelectable(hoverDay, today, anchor, maxDays) ? ordered(anchor, hoverDay) : null;
  const [shownStart, shownEnd] = preview ?? range;

  return (
    <div
      ref={rootRef}
      className="period-picker"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.stopPropagation();
          close();
        }
      }}
      // Tab para fora do seletor fecha o painel
      onBlur={(event) => {
        if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) close(false);
      }}
    >
      <button
        type="button"
        className="period-picker__step"
        onClick={() => shift(-1)}
        disabled={!canGoBack}
        aria-label="Período anterior"
        title="Período anterior"
      >
        <svg {...iconProps}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <button
        ref={pillRef}
        type="button"
        className="period-picker__pill"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        disabled={disabled}
        title={disabled ? disabledReason : formatRange(start, end)}
        onClick={() => {
          if (open) return close();
          setView('atalhos');
          setOpen(true);
        }}
      >
        <svg {...iconProps}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
        <span className="period-picker__label">
          <span className="sr-only">Período: </span>
          {periodLabel(start, end, today)}
        </span>
        {/* Com um atalho, as datas dele ficam ao lado, para o nome não esconder o intervalo */}
        {preset && preset.id !== 'hoje' && preset.id !== 'ontem' && <span className="period-picker__dates">{formatRange(start, end)}</span>}
        <svg {...iconProps} className="period-picker__chevron">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        className="period-picker__step"
        onClick={() => shift(1)}
        disabled={!canGoForward}
        aria-label="Próximo período"
        title="Próximo período"
      >
        <svg {...iconProps}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>

      {open && (
        <>
          {/* Só no celular: o fundo apagado atrás do painel, que fecha ao toque */}
          <div className="period-picker__scrim" aria-hidden="true" onPointerDown={() => close(false)} />
          <div ref={panelRef} id={panelId} className="period-picker__panel" role="dialog" aria-label="Escolher período">
            {view === 'atalhos' ? (
              <ul className="period-picker__options">
                {presets(today).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="period-picker__option"
                      aria-current={preset?.id === item.id || undefined}
                      // O mesmo atalho de novo também vale: a página decide (Emissões busca de novo)
                      onClick={() => choose(item.start, item.end)}
                    >
                      <span>{item.label}</span>
                      <span className="period-picker__option-dates">{formatRange(item.start, item.end)}</span>
                    </button>
                  </li>
                ))}
                <li className="period-picker__options-custom">
                  <button type="button" className="period-picker__option" aria-current={!preset || undefined} onClick={openCalendar}>
                    <span>Personalizado…</span>
                    {!preset && <span className="period-picker__option-dates">{formatRange(start, end)}</span>}
                  </button>
                </li>
              </ul>
            ) : (
              <div className="period-picker__calendar">
                <div className="period-picker__month">
                  <button
                    type="button"
                    className="period-picker__step"
                    onClick={() => setFocusDay(addMonths(focusDay, -1))}
                    aria-label="Mês anterior"
                    title="Mês anterior"
                  >
                    <svg {...iconProps}>
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <span aria-live="polite">{monthLabel(month)}</span>
                  <button
                    type="button"
                    className="period-picker__step"
                    onClick={() => {
                      const next = addMonths(focusDay, 1);
                      setFocusDay(next > today ? today : next);
                    }}
                    disabled={!canNextMonth}
                    aria-label="Próximo mês"
                    title="Próximo mês"
                  >
                    <svg {...iconProps}>
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>
                <table ref={gridRef} className="period-picker__grid" onKeyDown={handleGridKey} onPointerLeave={() => setHoverDay(null)}>
                  <caption className="sr-only">
                    {anchor ? 'Escolha o último dia do período' : 'Escolha o primeiro dia do período'}; as setas mudam o dia
                  </caption>
                  <thead>
                    <tr>
                      {WEEKDAYS.map(([short, long]) => (
                        <th key={short} scope="col">
                          <abbr title={long}>{short}</abbr>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthWeeks(month).map((week) => (
                      <tr key={week.find((day) => day !== null)}>
                        {week.map((day, index) => {
                          if (day === null) return <td key={`vazio-${index}`} />;
                          const selectable = isSelectable(day, today, anchor, maxDays);
                          const inRange = day >= shownStart && day <= shownEnd;
                          const isStart = day === shownStart;
                          const isEnd = day === shownEnd;
                          const cell = ['', inRange && 'is-in-range', isStart && 'is-start', isEnd && 'is-end'].filter(Boolean).join(' ');
                          const state = isStart && isEnd ? ', período de um dia' : isStart ? ', início do período' : isEnd ? ', fim do período' : inRange ? ', no período' : '';
                          return (
                            <td key={day} className={cell || undefined}>
                              <button
                                type="button"
                                data-day={day}
                                className={isStart || isEnd ? 'period-picker__day is-edge' : 'period-picker__day'}
                                tabIndex={day === focusDay ? 0 : -1}
                                aria-label={`${dayLabel(day)}${state}`}
                                aria-disabled={!selectable || undefined}
                                aria-current={day === today ? 'date' : undefined}
                                onClick={() => pick(day)}
                                onPointerEnter={() => setHoverDay(day)}
                                onFocus={() => {
                                  setFocusDay(day);
                                  if (anchor !== null) setHoverDay(day);
                                }}
                              >
                                {Number(day.slice(8))}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="period-picker__footer">
                  <span className="period-picker__count" aria-live="polite">
                    {formatDayCount(spanDays(shownStart, shownEnd))}
                  </span>
                  <button type="button" className="period-picker__btn" onClick={() => setView('atalhos')}>
                    Voltar
                  </button>
                  <button type="button" className="period-picker__btn period-picker__btn--primary" onClick={() => choose(range[0], range[1])}>
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
