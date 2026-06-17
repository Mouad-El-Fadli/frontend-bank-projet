import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { messageService } from '../api/api';

import {
  LayoutDashboard, Server, GitBranch, ClipboardList,
  FileSearch, LogOut, ChevronRight, Shield,
  Wrench, FileBarChart, Bell, Users, Building2, MessageCircle, Briefcase, MapPin
} from 'lucide-react';

const InfoRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="text-slate-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-xs text-slate-800 font-semibold truncate">{value}</p>
      </div>
    </div>
  );
};

/* ... previous imports and nav items ... */
const navItems = [
  { group: 'Général', items: [
    { to: '/',         icon: LayoutDashboard, label: 'Tableau de Bord', roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE'] },
    { to: '/alertes',  icon: Bell,            label: 'Alertes',         roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE'], badge: true },
    { to: '/messagerie', icon: MessageCircle, label: 'Messagerie',      roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE'] },
  ]},
  { group: 'Matériel', items: [
    { to: '/parc',        icon: Server,        label: 'Parc Matériel', roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE'] },
    { to: '/affectations',icon: GitBranch,     label: 'Affectations',  roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN'] },
    { to: '/historique',  icon: FileBarChart,  label: 'Historique',    roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN'] },
  ]},
  { group: 'Opérations', items: [
    { to: '/workflow',   icon: ClipboardList, label: 'Boîte de Demandes',roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_AGENCE', 'ROLE_TECHNICIEN'] },
    { to: '/maintenance',icon: Wrench,        label: 'Maintenance',  roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN'] },
  ]},
  { group: 'Sécurité', items: [
    { to: '/audit',   icon: FileSearch, label: 'Audit Trail',  roles: ['ROLE_ADMIN'] },
  ]},
  { group: 'Administration', items: [
    { to: '/directions',   icon: Building2, label: 'Directions Régionales', roles: ['ROLE_ADMIN'] },
    { to: '/utilisateurs', icon: Users, label: 'Gestion Comptes', roles: ['ROLE_ADMIN'] },
  ]},
];

const roleColors = {
  ROLE_ADMIN:      'bg-red-500',
  ROLE_MANAGER:    'bg-primary',
  ROLE_TECHNICIEN: 'bg-green-600',
  ROLE_AGENCE:     'bg-amber-500',
};

const roleLabels = {
  ROLE_ADMIN:      'Administrateur',
  ROLE_MANAGER:    'Manager IT',
  ROLE_TECHNICIEN: 'Technicien',
  ROLE_AGENCE:     'Chef d\'Agence',
};

export default function Sidebar({ collapsed, setCollapsed }) {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const fetchUnread = async () => {
      if (!user) return;
      try {
        const { data } = await messageService.getUnreadCount();
        setUnreadCount(data.count || 0);
      } catch (err) {
        // silencieux
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Nom affiché : prénom + nom (format Flask) ou fallback
  const displayName = user
    ? `${user.prenom || ''} ${user.nom || ''}`.trim() || user.email || 'Utilisateur'
    : 'Utilisateur';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const userRole = user?.role || user?.nomRole || '';

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-64'}
        bg-[var(--bg-card)] border-r border-[var(--border-color)] shadow-2xl`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border-color)]">
        <div className={`flex-shrink-0 overflow-hidden rounded-xl transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-12 h-12'}`}>
          <img
            src="/logo.jpeg"
            alt="Parc IT Smart"
            className="w-full h-full object-cover"
            style={{ objectPosition: '55% center', transform: 'scale(1.4)', transformOrigin: '55% center' }}
            onError={(e) => { e.target.src = '/static/images/parcIT.jpeg'; }}
          />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[var(--text-primary)] font-bold text-sm tracking-wide leading-tight">Parc IT Smart</p>
            <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-tighter">Banque Populaire</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--border-color)] transition-all"
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
        {navItems.map((group) => {
          // Filtrer selon les rôles via hasRole (qui gère alias court ET nom complet)
          const visibleItems = group.items.filter(item =>
            item.roles.some(r => hasRole(r))
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                  {group.group}
                </p>
              )}
              {visibleItems.map(({ to, icon: Icon, label, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate flex-1">{label}</span>}
                  
                  {/* Badge d'Alerte traditionnel (ex: /alertes) */}
                  {badge && !collapsed && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                  )}

                  {/* Badge numérique orange pour Messagerie */}
                  {to === '/messagerie' && unreadCount > 0 && !collapsed && (
                    <span className="bg-orange-500/10 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded text-[10px] font-bold shadow-lg shadow-orange-500/10">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {to === '/messagerie' && unreadCount > 0 && collapsed && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50" />
                  )}

                  {!collapsed && location.pathname === to && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-70" />
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User Profile Area */}
      <div className="border-t border-[var(--border-color)] p-3 relative">
        {/* Bouton déclencheur */}
        <button 
          onClick={() => setShowProfile(!showProfile)}
          className={`flex items-center gap-3 w-full px-2 py-2.5 rounded-xl hover:bg-[var(--bg-card-hover)] transition-all ${collapsed ? 'justify-center' : ''}`}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center text-white text-sm font-bold shadow-inner border border-white/10">
              {initials}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-card)] ${roleColors[userRole] || 'bg-gray-500'}`} />
          </div>
          
          {!collapsed && (
            <div className="flex-1 text-left min-w-0">
              <p className="text-[var(--text-primary)] text-sm font-bold truncate">{displayName}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
            </div>
          )}
        </button>

        {/* Popover carte profil stylisée */}
        {showProfile && (
          <>
            {/* Click-away overlay (optionnel pour fermer en cliquant à côté) */}
            <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)}></div>
            
            <div className={`absolute z-50 w-72 bottom-16 ${collapsed ? 'left-20' : 'left-4'} bg-white border border-slate-200/60 rounded-2xl shadow-2xl overflow-hidden animate-slide-up ring-1 ring-black/5`}>
              
              {/* Header Profile */}
              <div className="bg-gradient-to-br from-primary to-orange-500 px-5 py-6 text-center relative">
                <div className="w-16 h-16 rounded-full bg-white mx-auto mb-3 flex items-center justify-center text-primary text-2xl font-bold shadow-lg border-4 border-white/20">
                  {initials}
                </div>
                <p className="text-white font-bold text-base tracking-tight">{displayName}</p>
                <p className="text-white/80 text-[11px] mt-0.5">{user?.email}</p>
                
                <span className="mt-3 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md rounded-full px-3 py-1 border border-white/20 shadow-sm text-white text-[10px] font-bold uppercase tracking-wider">
                  <span className={`w-2 h-2 rounded-full ${roleColors[userRole] ? roleColors[userRole].replace('bg-', 'bg-') : 'bg-white'}`}></span>
                  {roleLabels[userRole] || userRole}
                </span>
                
                {/* Close Button top right */}
                <button 
                  onClick={() => setShowProfile(false)}
                  className="absolute top-3 right-3 text-white/60 hover:text-white bg-black/10 hover:bg-black/20 p-1.5 rounded-full transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              {/* Infos Géographiques */}
              <div className="p-4 space-y-1 bg-slate-50/50">
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Direction Régionale" value={user?.succursale} />
                <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Agence Bancaire" value={user?.agence} />
                {!user?.succursale && !user?.agence && (
                  <p className="text-[10px] text-slate-400 text-center italic py-2">Profil Administration Globale</p>
                )}
              </div>

              {/* Actions */}
              <div className="p-3 bg-white border-t border-slate-100">
                <button 
                  onClick={() => { setShowProfile(false); logout(); }}
                  className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-xs hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> 
                  Déconnexion Sécurisée
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
