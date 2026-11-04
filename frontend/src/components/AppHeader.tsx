import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import Brand from './Brand';
import './AppHeader.css';

/**
 * Nome e botão de sair. Sem sessão o cabeçalho não aparece (as páginas exigem login, #257); a exceção é o modo
 * demonstração, sem backend nem login, em que o menu fica vazio.
 */
function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="user-menu">
      <span title={user.email}>
        Olá, <strong>{user.name}</strong>
      </span>
      {/* Sem sessão, o ProtectedRoute leva ao login e as páginas desmontam, o que para o polling */}
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
