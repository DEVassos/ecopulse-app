import { Navigate, Route, Routes } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import ComparePage from './pages/ComparePage';
import DashboardPage from './pages/DashboardPage';
import EmissionsPage from './pages/EmissionsPage';
import LoginPage from './pages/LoginPage';
import SettingsPage from './pages/SettingsPage';
import AuthProvider from './providers/AuthProvider';
import MonitoringProvider from './providers/MonitoringProvider';

export default function App() {
  return (
    <AuthProvider>
      <MonitoringProvider>
        <Routes>
          {/* Área pública: o dashboard abre direto, sem login */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/emissoes" element={<EmissionsPage />} />
          <Route path="/comparacao" element={<ComparePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Área restrita: sem sessão, o ProtectedRoute manda para /login */}
          <Route
            path="/configuracao"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MonitoringProvider>
    </AuthProvider>
  );
}
