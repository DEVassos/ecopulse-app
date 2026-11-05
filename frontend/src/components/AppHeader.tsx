import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import Brand from './Brand';
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
      <span title={user.email}>
        Olá, <strong>{user.name}</strong>
      </span>
      {/* No dashboard a pessoa continua onde está; na área restrita o ProtectedRoute leva ao login */}
      <button type="button" className="btn-outline" onClick={logout}>
        Sair
      </button>
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

        {/* NavLink marca o link da página atual com a classe "active" e aria-current="page" */}
        <nav ref={navRef} className="nav" aria-label="Principal">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/emissoes">Emissões</NavLink>
          <NavLink to="/comparacao">Comparação</NavLink>
          <NavLink to="/configuracao">Configuração</NavLink>
        </nav>

        {/* No celular as duas caixas se separam: Entrar/Sair sobe para a linha da marca e a atualização desce para
            baixo do menu (AppHeader.css) */}
        <div className="topbar-actions">
          {children && <div className="topbar-status">{children}</div>}
          <div className="topbar-user">
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
