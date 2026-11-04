import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
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
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" className="topbar-brand" aria-label="EcoPulse — ir para o dashboard">
          <Brand pulseKey={updatedAt} />
        </NavLink>

        {/* NavLink marca o link da página atual com a classe "active" e aria-current="page" */}
        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/emissoes">Emissões</NavLink>
          <NavLink to="/comparacao">Comparação</NavLink>
          <NavLink to="/configuracao">Configuração</NavLink>
        </nav>

        <div className="topbar-actions">
          {children}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
