import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import { isDemoMode } from '../services/services.service';
import { returnPath } from '../utils/login-redirect';
import type { LoginRedirectState } from '../utils/login-redirect';

/**
 * Guarda de todas as páginas (#257): sem sessão, manda para /login e volta à mesma tela depois do login.
 * Sem sessão nenhuma página monta, então nenhuma busca nem polling começa; ao sair ou com um 401, as páginas
 * desmontam e o polling para junto (usePolling cancela no desmonte).
 * Só melhora a navegação: quem protege os dados é o backend (401 sem token válido).
 * No modo demonstração (sem VITE_API_URL) não há backend nem login possível, e os dados são ilustrativos:
 * as páginas abrem direto, com a faixa de aviso de cada uma. `allowDemo={false}` (Configuração) exige a sessão
 * mesmo assim: sem backend, a pessoa vai para o login, que explica que ele precisa da API.
 */
export default function ProtectedRoute({ children, allowDemo = true }: { children?: ReactNode; allowDemo?: boolean }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user && !(isDemoMode && allowDemo)) {
    const state: LoginRedirectState = { from: returnPath(location) };
    return <Navigate to="/login" replace state={state} />;
  }
  return children ?? <Outlet />;
}
