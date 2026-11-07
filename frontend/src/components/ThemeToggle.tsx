import { useTheme } from '../hooks/useTheme';

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  className: 'size-[18px]',
} as const;

/**
 * Alterna o tema claro e o escuro (#265). O ícone mostra o tema para o qual o botão leva (sol no escuro, lua no claro),
 * e o rótulo diz a ação, para o leitor de tela não ter de adivinhar pelo desenho.
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro';
  return (
    <button type="button" onClick={toggle} aria-label={label} data-tooltip={label} className="btn-outline grid size-11 shrink-0 place-items-center">
      {theme === 'dark' ? (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg {...iconProps}>
          <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
        </svg>
      )}
    </button>
  );
}
