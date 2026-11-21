import { Navigate, Route, Routes } from 'react-router';
import ProtectedRoute from './components/ProtectedRoute';
import TooltipLayer from './components/TooltipLayer';
import ComparePage from './pages/ComparePage';
import DashboardPage from './pages/DashboardPage';
import EmissionsPage from './pages/EmissionsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';
import AuthProvider from './providers/AuthProvider';
import MonitoringProvider from './providers/MonitoringProvider';

export default function App() {
  return (
    <AuthProvider>
      <MonitoringProvider>
        <Routes>
          {/* Abertas sem sessão: o login e o cadastro por convite (#197), que só funciona com um convite válido */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />

          {/* Aplicação inteira exige sessão (#257): sem ela, o ProtectedRoute manda para /login */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/emissoes" element={<EmissionsPage />} />
            <Route path="/comparacao" element={<ComparePage />} />
          </Route>
          {/* Configuração e Perfil (#401) exigem sessão até no modo demonstração, em que não há backend para entrar */}
          <Route element={<ProtectedRoute allowDemo={false} />}>
            <Route path="/configuracao" element={<SettingsPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* Um tooltip só para a aplicação inteira (#274): qualquer elemento com data-tooltip */}
        <TooltipLayer />
      </MonitoringProvider>
    </AuthProvider>
  );
}
