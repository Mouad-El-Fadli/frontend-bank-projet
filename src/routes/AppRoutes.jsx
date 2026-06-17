import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppLayout from '../layouts/AppLayout';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import ParcMateriel from '../pages/ParcMateriel';
import Affectations from '../pages/Affectations';
import Workflow from '../pages/Workflow';
import AuditTrail from '../pages/AuditTrail';
import Maintenance from '../pages/Maintenance';

import Alerts from '../pages/Alerts';
import Utilisateurs from '../pages/Utilisateurs';
import Historique from '../pages/Historique';
import DirectionsRegionales from '../pages/DirectionsRegionales';
import PublicScan from '../pages/PublicScan';
import Messagerie from '../pages/Messagerie';

// Guard de route — redirige vers /login si non connecté,
// ou vers la page par défaut de son rôle si accès refusé
const ProtectedRoute = ({ children, roles }) => {
  const { user, hasRole, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;

  // Accès refusé → rediriger vers la page par défaut selon le rôle
  if (roles && !hasRole(roles)) {
    const role = user.role || '';
    if (role === 'ROLE_AGENCE') return <Navigate to="/workflow" replace />;
    if (role === 'ROLE_TECHNICIEN') return <Navigate to="/parc" replace />;
    return <Navigate to="/parc" replace />;
  }

  return children;
};

// Redirige vers la bonne page d'accueil selon le rôle
const HomeRedirect = () => {
  const { user, canAccess } = useAuth();
  const role = user?.role || '';
  if (canAccess('dashboard')) return <Dashboard />;
  if (role === 'ROLE_AGENCE')     return <Navigate to="/workflow" replace />;
  if (role === 'ROLE_TECHNICIEN') return <Navigate to="/parc" replace />;
  return <Navigate to="/parc" replace />;
};

export default function AppRoutes() {
  return (
    <Routes>
      {/* Page publique */}
      <Route path="/login" element={<Login />} />
      <Route path="/scan/:numeroSerie" element={<PublicScan />} />

      {/* Pages protégées — layout avec sidebar */}
      <Route element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        {/* Dashboard — périmètre agence / direction appliqué côté API */}
        <Route path="/" element={
          <ProtectedRoute roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE']}>
            <HomeRedirect />
          </ProtectedRoute>
        } />

        {/* Parc matériel */}
        <Route path="/parc" element={
          <ProtectedRoute roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE']}>
            <ParcMateriel />
          </ProtectedRoute>
        } />

        {/* Affectations */}
        <Route path="/affectations" element={
          <ProtectedRoute roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN']}>
            <Affectations />
          </ProtectedRoute>
        } />

        {/* Demandes / Workflow */}
        <Route path="/workflow" element={
          <ProtectedRoute roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_AGENCE', 'ROLE_TECHNICIEN']}>
            <Workflow />
          </ProtectedRoute>
        } />

        {/* Maintenance */}
        <Route path="/maintenance" element={
          <ProtectedRoute roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN']}>
            <Maintenance />
          </ProtectedRoute>
        } />



        {/* Historique (remplace Inventaire pour PFE) */}
        <Route path="/historique" element={
          <ProtectedRoute roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN']}>
            <Historique />
          </ProtectedRoute>
        } />

        {/* Compat: ancienne URL inventaire */}
        <Route path="/inventaire" element={<Navigate to="/historique" replace />} />

        {/* Alertes — accessible à tous */}
        <Route path="/alertes" element={<Alerts />} />

        {/* Messagerie Interne */}
        <Route path="/messagerie" element={
          <ProtectedRoute roles={['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE']}>
            <Messagerie />
          </ProtectedRoute>
        } />

        {/* Audit Trail */}
        <Route path="/audit" element={
          <ProtectedRoute roles={['ROLE_ADMIN']}>
            <AuditTrail />
          </ProtectedRoute>
        } />

        {/* Gestion Comptes */}
        <Route path="/utilisateurs" element={
          <ProtectedRoute roles={['ROLE_ADMIN']}>
            <Utilisateurs />
          </ProtectedRoute>
        } />

        {/* Directions Régionales */}
        <Route path="/directions" element={
          <ProtectedRoute roles={['ROLE_ADMIN']}>
            <DirectionsRegionales />
          </ProtectedRoute>
        } />
      </Route>

      {/* Route inconnue → rediriger vers dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
