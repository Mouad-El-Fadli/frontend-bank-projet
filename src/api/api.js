/**
 * api/api.js — Client HTTP Axios
 * Connecté au backend Flask MVC sur http://localhost:5000/api
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: false,
});

// ── Validation du format JWT au démarrage ─────────────────────
// Un JWT valide a exactement 3 segments séparés par '.'
const isValidJwt = (token) => {
  if (!token || typeof token !== 'string') return false;
  return token.split('.').length === 3;
};

// Nettoyer localStorage si le token stocké est invalide (fake/corrompu)
const storedToken = localStorage.getItem('access_token');
if (storedToken && !isValidJwt(storedToken)) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  localStorage.removeItem('token');
}

// ── Intercepteur requête : injecter le token JWT ──────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && isValidJwt(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Intercepteur réponse : gérer 401 et 422 (token invalide) ──
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errMsg = error.response?.data?.msg || error.response?.data?.message || '';

    // 422 avec "Not enough segments" = token corrompu → déconnexion
    if (status === 422 && errMsg.toLowerCase().includes('segment')) {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken && isValidJwt(refreshToken)) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: { Authorization: `Bearer ${refreshToken}` },
          });
          localStorage.setItem('access_token', data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ══════════════════════════════════════════════════════════════
// Services — Routes Flask MVC (/api/...)
// ══════════════════════════════════════════════════════════════

// ── Auth ──────────────────────────────────────────────────────
export const authService = {
  login:   (credentials) => api.post('/auth/login', credentials),
  refresh: ()            => api.post('/auth/refresh'),
  me:      ()            => api.get('/auth/me'),
  logout:  ()            => api.post('/auth/logout'),
};

// ── Équipements ───────────────────────────────────────────────
export const equipmentService = {
  getAll:      (params) => api.get('/equipements', { params }),
  getById:     (id)     => api.get(`/equipements/${id}`),
  create:      (data)   => api.post('/equipements', data),
  update:      (id, data) => api.put(`/equipements/${id}`, data),
  delete:      (id)     => api.delete(`/equipements/${id}`),
  // Backend statuts: DISPONIBLE, AFFECTE, EN_PANNE, EN_MAINTENANCE, RETIRE
  setHS:       (id)     => api.put(`/equipements/${id}`, { statut: 'EN_PANNE' }),
  generateQR:  (id, clientUrl) => api.get(`/equipements/${id}/qrcode`, { params: { clientUrl }, responseType: 'blob' }),
  getPublicInfo: (numeroSerie) => api.get(`/equipements/public/${numeroSerie}`),
  getAlertes:  ()       => api.get('/equipements/alertes'),
  getTypes:    ()       => api.get('/equipements/types'),
};

// ── Agences & Succursales ─────────────────────────────────────
export const agenceService = {
  getAll:       ()       => api.get('/agences'),
  create:       (data)   => api.post('/agences', data),
  update:       (id, data) => api.put(`/agences/${id}`, data),
  delete:       (id)     => api.delete(`/agences/${id}`),
  getSuccursales: ()     => api.get('/agences/succursales'),
  createSuccursale: (data) => api.post('/agences/succursales', data),
};

// ── Affectations ──────────────────────────────────────────────
export const affectationService = {
  getAll:     (params)   => api.get('/affectations', { params }),
  create:     (data)     => api.post('/affectations', data),
  restituer:  (id, data) => api.post(`/affectations/${id}/restituer`, data),
  getPV:      (id, type) => api.get(`/affectations/${id}/pv`, { params: { type } }),
};

// ── Demandes Matériel ─────────────────────────────────────────
export const demandeService = {
  getAll:   (params) => api.get('/demandes', { params }),
  create:   (data)   => api.post('/demandes', data),
  valider:  (id, data) => api.post(`/demandes/${id}/valider`, data),
};

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardService = {
  getStats:        () => api.get('/dashboard/stats'),
  getParAgence:    () => api.get('/dashboard/par-agence'),
  getParType:      () => api.get('/dashboard/par-type'),
  getEvolution:    () => api.get('/dashboard/evolution'),
  getHistorique:   () => api.get('/dashboard/historique-recent'),
};

// ── Utilisateurs ──────────────────────────────────────────────
export const utilisateurService = {
  getAll:  ()         => api.get('/utilisateurs'),
  create:  (data)     => api.post('/utilisateurs', data),
  update:  (id, data) => api.put(`/utilisateurs/${id}`, data),
  delete:  (id)       => api.delete(`/utilisateurs/${id}`),
};

// ── Workflow / Demandes + Affectations ───────────────────────
export const workflowService = {
  // Demandes
  getDemandes:    (params)     => api.get('/demandes', { params }),
  createDemande:  (data)       => api.post('/demandes', data),
  affecterDemande:(id, data)   => api.post(`/demandes/${id}/affecter`, data),
  refuserDemande: (id, data)   => api.post(`/demandes/${id}/refuser`, data),
  resoudreDemande:(id, data)   => api.post(`/demandes/${id}/resoudre`, data),
  // Affectations
  getAffectations:   (params)   => api.get('/affectations', { params }),
  createAffectation: (data)     => api.post('/affectations', data),
  signerAffectation: (id, sig)  => api.post(`/affectations/${id}/signer`, { signature: sig }),
  retourAffectation: (id, data) => api.post(`/affectations/${id}/restituer`, data),
};

// ── Maintenance ───────────────────────────────────────────────
// Pas d'endpoint /tickets → on utilise les équipements filtrés par statut
export const maintenanceService = {
  // Fetch equipment in EN_MAINTENANCE status (exists in backend)
  getTickets:     (params) => api.get('/equipements', { params: { ...params } }),
  getEnMaintenance: ()     => api.get('/equipements', { params: { statut: 'EN_MAINTENANCE' } }),
  getEnPanne:     ()       => api.get('/equipements', { params: { statut: 'EN_PANNE' } }),
  getAlertes:     ()       => api.get('/equipements/alertes'),
  updateStatut:   (id, s)  => api.put(`/equipements/${id}`, { statut: s }),
  resoudrePanne:  (id, data) => api.post(`/equipements/${id}/resoudre_panne`, data),
};


// ── Inventaire ────────────────────────────────────────────────
export const inventoryService = {
  getSessions:   ()         => api.get('/equipements'),
  createSession: (data)     => api.post('/equipements', data),
  scan:          (id, data) => api.put(`/equipements/${id}`, data),
  getRapport:    (id)       => api.get(`/equipements/${id}`),
};

// ── Alertes ───────────────────────────────────────────────────
export const alertService = {
  getAll:       (params) => api.get('/equipements/alertes', { params }),
  markAsRead:   (id)     => api.put(`/equipements/${id}`, { lu: true }),
  markAllAsRead: ()      => api.get('/equipements/alertes'),
  traiter:      (id)     => api.put(`/equipements/${id}`, { statut: 'TRAITE' }),
};

// ── Audit Trail ───────────────────────────────────────────────
export const historyService = {
  getAll: (params) => api.get('/dashboard/historique-recent', { params }),
};


// ── Import Excel ──────────────────────────────────────────────
export const importService = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/equipements/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  confirmer: (data) => api.post('/equipements/import/confirmer', data),
  getLogs:   ()     => api.get('/equipements/import/logs'),
};

// ── Chatbot RAG ───────────────────────────────────────────────
export const chatbotService = {
  // contexte_live = snapshot des données live de l'app (KPIs, alertes...)
  ask: (question, contexte_live = null) =>
    api.post('/chatbot/query', { question, ...(contexte_live ? { contexte_live } : {}) }, { timeout: 180000 }),
  feedback:        (data)     => api.post('/chatbot/feedback', data),
  indexingStatus:  ()         => api.get('/chatbot/indexing_status'),
  refreshTable:    ()         => api.post('/chatbot/refresh_table'),
  triggerETL:      ()         => api.post('/chatbot/etl/export'),
};

// ── Messagerie Interne ────────────────────────────────────────
export const messageService = {
  getConversations: ()           => api.get('/messages/conversations'),
  getThread:        (partnerId)  => api.get(`/messages/${partnerId}`),
  send:             (data)       => api.post('/messages', data),
  markRead:         (partnerId)  => api.put(`/messages/${partnerId}/lire`),
  getUnreadCount:   ()           => api.get('/messages/non-lus'),
  getUsers:         ()           => api.get('/messages/utilisateurs'),
};

// ── Documents ────────────────────────────────────────────────
export const documentService = {
  getPV: (demandeId) => api.get(`/documents/pv/${demandeId}`, { responseType: 'blob' }),
};


export default api;
