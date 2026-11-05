import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import Brand from './Brand';
import ThemeToggle from './ThemeToggle';
import './AppHeader.css';

/** Visitante vê "Entrar"; quem tem sessão vê o nome e o botão de sair. */
function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Link className="btn-login" to="/login">
        Entrar
      </Link>
    );
  }

  return (
    <div className="user-menu">
      <span data-tooltip={user.email}>
        Olá, <strong>{user.name}</strong>
      </span>
      {/* No dashboard a pessoa continua onde está; na área restrita o ProtectedRoute leva ao login */}
      <button type="button" className="btn-outline" onClick={logout}>
        Sair
      </button>
    </div>
  );
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Páginas do menu, na mesma ordem na faixa (tela larga) e na grade (celular). */
const PAGES: Array<{ to: string; label: string; end?: boolean; icon: ReactNode }> = [
  {
    to: '/',
    label: 'Dashboard',
    end: true,
    icon: (
      <svg {...iconProps}>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/emissoes',
    label: 'Emissões',
    icon: (
      <svg {...iconProps}>
        <path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z" />
      </svg>
    ),
  },
  {
    to: '/comparacao',
    label: 'Comparação',
    icon: (
      <svg {...iconProps}>
        <path d="M3 3v18h18" />
        <path d="M8 17v-4M13 17V7M18 17v-7" />
      </svg>
    ),
  },
  {
    to: '/configuracao',
    label: 'Configuração',
    icon: (
      <svg {...iconProps}>
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
      </svg>
    ),
  },
];

/**
 * Menu do celular (#274): abaixo de 600 px, a faixa que rolava de lado vira o botão "Menu", que abre uma grade com
 * as páginas (ícone sobre o rótulo). Fecha ao tocar num item, ao tocar fora, com Esc e ao trocar de página.
 */
function MobileMenu() {
  const { pathname } = useLocation();
  // Aberto para a página em que foi aberto: trocar de página (link, voltar do navegador) já fecha, sem efeito
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpenAt(null);
      buttonRef.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="mobile-menu">
      <button
        ref={buttonRef}
        type="button"
        className="mobile-menu__button"
        aria-expanded={open}
        aria-controls="menu-grade"
        onClick={() => setOpenAt(open ? null : pathname)}
      >
        <svg {...iconProps} width={18} height={18}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        <span className="mobile-menu__label">Menu</span>
      </button>
      {open && (
        <>
          <div className="mobile-menu__scrim" aria-hidden="true" onClick={() => setOpenAt(null)} />
          <div id="menu-grade" className="mobile-menu__panel">
            <nav className="mobile-menu__grid" aria-label="Principal">
              {PAGES.map((page) => (
                <NavLink key={page.to} to={page.to} end={page.end} onClick={() => setOpenAt(null)}>
                  {page.icon}
                  {page.label}
                </NavLink>
              ))}
            </nav>
            {/* No celular o tema mora aqui (#265 + #274): na linha da marca, Menu e Entrar já ocupam a largura toda */}
            <div className="mobile-menu__theme">
              <span>{theme === 'dark' ? 'Tema escuro' : 'Tema claro'}</span>
              <ThemeToggle />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  /** Conteúdo à direita do menu (indicador de atualização, filtros da página). */
  children?: ReactNode;
  /** Horário da última atualização dos dados, repassado ao logo para pulsar (só em páginas com polling). */
  updatedAt?: string | null;
}

export default function AppHeader({ children, updatedAt }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Celular (#263): o menu rola na horizontal e o item ativo podia ficar cortado ("Con…"); a cada página, ele rola até
  // aparecer inteiro. Com "nearest", nada se move quando o item já está à vista (sempre, na tela larga)
  useEffect(() => {
    navRef.current?.querySelector('a.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

  return (
    <header className="topbar">
      {/* Primeiro item do Tab (#262): pula marca, menu e ações e leva ao <main id="conteudo"> da página */}
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="topbar-inner">
        <NavLink to="/" className="topbar-brand" aria-label="EcoPulse — ir para o dashboard">
          <Brand pulseKey={updatedAt} />
        </NavLink>

        {/* NavLink marca o link da página atual com a classe "active" e aria-current="page". Abaixo de 600 px esta
            faixa some e o MobileMenu entra no lugar dela */}
        <nav ref={navRef} className="nav" aria-label="Principal">
          {PAGES.map((page) => (
            <NavLink key={page.to} to={page.to} end={page.end}>
              {page.label}
            </NavLink>
          ))}
        </nav>
        <MobileMenu />

        {/* No celular as duas caixas se separam: Entrar/Sair sobe para a linha da marca e a atualização desce para
            baixo do menu (AppHeader.css) */}
        <div className="topbar-actions">
          {children && <div className="topbar-status">{children}</div>}
          {/* Tema junto do Entrar/Sair: as duas ações da pessoa, não da página (#265) */}
          <div className="topbar-user">
            {/* Abaixo de 600 px, o tema vai para o painel do Menu */}
            <span className="topbar-theme">
              <ThemeToggle />
            </span>
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
