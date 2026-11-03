import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../hooks/useAuth';

/**
 * Guarda das rotas da área restrita: sem sessão, manda para /login e volta depois do login.
 * Só melhora a navegação — quem protege os dados é o backend (401 sem token válido).
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
