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
          {/* Única página aberta sem sessão */}
          <Route path="/login" element={<LoginPage />} />

          {/* Aplicação inteira exige sessão (#257): sem ela, o ProtectedRoute manda para /login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/emissoes" element={<EmissionsPage />} />
            <Route path="/comparacao" element={<ComparePage />} />
          </Route>
          {/* Configuração exige sessão até no modo demonstração, em que não há backend para entrar */}
          <Route element={<ProtectedRoute allowDemo={false} />}>
            <Route path="/configuracao" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MonitoringProvider>
    </AuthProvider>
  );
}
