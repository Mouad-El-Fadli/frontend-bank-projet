/**
 * contexts/AuthContext.jsx — Gestion JWT + RBAC
 * Banque Populaire PFE V5
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const DISABLE_RBAC = (import.meta.env.VITE_DISABLE_RBAC || '').toString().toLowerCase() === 'true';
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydratation au démarrage depuis localStorage
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const storedUser = localStorage.getItem('user');

    if (accessToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        
        // Re-synchroniser en arrière-plan pour obtenir les dernières affectations (ex: idSuccursale)
        api.get('/auth/me').then(res => {
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        }).catch(() => {});
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async ({ username, password }) => {
    try {
      // Flask attend : { email, password }
      const { data } = await api.post('/auth/login', {
        email: username,   // Le champ de saisie s'appelle username mais Flask attend email
        password,
      });

      // Flask retourne : { access_token, refresh_token, user: {...} }
      localStorage.setItem('access_token',  data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user',           JSON.stringify(data.user));

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error   ||
        error.response?.data?.msg     ||
        'Identifiants incorrects';
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    // Compatibilité ancien nom de clé
    localStorage.removeItem('token');
  }, []);

  /**
   * hasRole(roles) — Vérifie si l'utilisateur a l'un des rôles passés.
   * Accepte un string ou un tableau.
   *
   * Rôles possibles : 'ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE'
   * Alias courts : 'ADMIN', 'MANAGER', 'TECH', 'AGENCE'
   */
  const hasRole = useCallback((...roles) => {
    if (DISABLE_RBAC) return true;
    if (!user) return false;
    if (user.is_admin) return true;

    const flatRoles = roles.flat();
    const userRole  = user.role || user.nomRole || '';

    // Table de correspondance alias court ↔ nom complet Flask
    const ROLE_MAP = {
      ADMIN:     'ROLE_ADMIN',
      MANAGER:   'ROLE_MANAGER',
      TECH:      'ROLE_TECHNICIEN',
      TECHNICIEN:'ROLE_TECHNICIEN',
      AGENCE:    'ROLE_AGENCE',
    };

    return flatRoles.some((r) => {
      const fullRole = ROLE_MAP[r] || r;  // alias → complet, ou déjà complet
      return userRole === fullRole || userRole === r;
    });
  }, [user, DISABLE_RBAC]);


  /**
   * canAccess(feature) — Vérification sémantique des permissions
   */
  const canAccess = useCallback((feature) => {
    if (DISABLE_RBAC) return true;
    if (!user) return false;
    const role = user.role || '';

    /*
     * Matrice des permissions — Banque Populaire
     * ┌─────────────────────┬────────┬─────────┬───────────┬────────┐
     * │ Feature             │ ADMIN  │ MANAGER │ TECHNICIEN│ AGENCE │
     * ├─────────────────────┼────────┼─────────┼───────────┼────────┤
     * │ dashboard           │   ✅   │    ✅   │     ✅    │   ✅   │
     * │ equipment_read      │   ✅   │    ✅   │     ✅    │   ✅*  │
     * │ equipment_write     │   ✅   │    ✅   │     ✅    │   ❌   │
     * │ affectations        │   ✅   │    ✅   │     ✅    │   ❌   │
     * │ validate_demandes   │   ✅   │    ✅   │     ❌    │   ❌   │
     * │ create_demande      │   ✅   │    ✅   │     ❌    │   ✅   │
     * │ gestion_comptes     │   ✅   │    ❌   │     ❌    │   ❌   │
     * └─────────────────────┴────────┴─────────┴───────────┴────────┘
     * * AGENCE / TECH : périmètre filtré côté backend (agence ou direction)
     */
    const PERMISSIONS = {
      dashboard:         ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE'],
      equipment_read:    ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN', 'ROLE_AGENCE'],
      equipment_write:   ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN'],
      affectations:      ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN'],
      validate_demandes: ['ROLE_ADMIN', 'ROLE_MANAGER'],
      create_demande:    ['ROLE_AGENCE'],
      gestion_comptes:   ['ROLE_ADMIN'],
      all_park_access:   ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_TECHNICIEN'],
    };

    if (user.is_admin) return true;
    return (PERMISSIONS[feature] || []).includes(role);
  }, [user, DISABLE_RBAC]);

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, canAccess, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
};
