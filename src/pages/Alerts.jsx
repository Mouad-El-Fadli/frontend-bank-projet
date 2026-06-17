import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertService } from '../api/api';
import {
  Bell, Check, Trash2, AlertTriangle,
  Info, Calendar, ArrowRight, ShieldAlert, WifiOff, Loader2,
  Clock, CheckCircle, XCircle, Wrench
} from 'lucide-react';
import ExportButton from '../components/ExportButton';

const TYPE_CONFIG = {
  'MAINTENANCE': { icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10' },
  'GARANTIE':   { icon: ShieldAlert,   color: 'text-orange-500 bg-orange-500/10' },
  'INVENTAIRE': { icon: Info,          color: 'text-emerald-500 bg-emerald-500/10' },
  'CRITIQUE':   { icon: Bell,          color: 'text-red-500 bg-red-500/10' },
  'INFO':       { icon: Info,          color: 'text-blue-500 bg-blue-500/10' },
  // Nouveaux types personnalisés
  'A_VALIDER':  { icon: Clock,         color: 'text-indigo-500 bg-indigo-500/10' },
  'INTERVENTION':{ icon: Wrench,       color: 'text-primary bg-primary/10' },
  'REJETE':     { icon: XCircle,       color: 'text-red-500 bg-red-500/10' },
  'RESOLU':     { icon: CheckCircle,   color: 'text-emerald-500 bg-emerald-500/10' }
};

// Persistance locale de l'état "lu"
const LS_KEY = 'alertes_lues';
const getReadIds  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const saveReadIds = (ids) => localStorage.setItem(LS_KEY, JSON.stringify(ids));

export default function Alerts() {
  const [alertes, setAlertes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const navigate = useNavigate();

  const handleAgir = (id) => {
    if (String(id).startsWith('dem-aff-')) {
      const targetId = String(id).split('-')[2];
      navigate('/workflow', { state: { openResolveModal: true, targetId } });
    } else if (String(id).startsWith('gar-') || String(id).startsWith('amo-')) {
      const targetId = String(id).split('-')[1];
      navigate('/parc', { state: { targetId } });
    } else if (String(id).startsWith('dem-')) {
      navigate('/workflow');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setApiError(false);
      try {
        const { data } = await alertService.getAll();
        const readIds = getReadIds();

        // Le backend retourne maintenant un tableau plat standardisé d'alertes via le contrôleur
        const raw = (Array.isArray(data) ? data : []).map(alerte => ({
          ...alerte,
          lue: readIds.includes(alerte.id),
        }));

        setAlertes(raw);
      } catch {
        setApiError(true);
        setAlertes([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fetchFullAlertsData = async () => {
    try {
      const { data } = await alertService.getAll({ limit: 10000, pagination: false });
      const readIds = getReadIds();
      return (Array.isArray(data) ? data : []).map(alerte => ({
        ...alerte,
        lue: readIds.includes(alerte.id || alerte.idAlerte),
      }));
    } catch {
      return alertes;
    }
  };

  const markAsRead = (id) => {
    setAlertes(prev => prev.map(a => (a.id === id || a.idAlerte === id) ? { ...a, lue: true } : a));
    const ids = getReadIds();
    if (!ids.includes(id)) saveReadIds([...ids, id]);
    alertService.markAsRead(id).catch(() => {});
  };

  const markAllAsRead = () => {
    setAlertes(prev => prev.map(a => ({ ...a, lue: true })));
    saveReadIds([...new Set([...getReadIds(), ...alertes.map(a => a.id || a.idAlerte)])]);
  };

  const deleteAlerte = (id) => {
    setAlertes(prev => prev.filter(a => a.id !== id && a.idAlerte !== id));
  };

  const unreadCount = alertes.filter(a => !a.lue).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Chargement des alertes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[var(--text-primary)] font-bold text-2xl flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            Centre d'Alertes
            {unreadCount > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Notifications système et rappels de maintenance</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-[34px]">
            <ExportButton 
              data={alertes}
              filteredData={alertes}
              fetchFullData={fetchFullAlertsData}
              columns={[
                { header: 'Type', accessor: r => r.type || r.typeAlerte || 'CRITIQUE' },
                { header: 'Titre', accessor: r => r.titre || r.message?.substring(0, 50) || 'Alerte' },
                { header: 'Message', accessor: r => r.message || r.description || '' },
                { header: 'Date', accessor: r => r.date || r.dateCreation || r.date_creation ? new Date(r.date || r.dateCreation || r.date_creation).toLocaleDateString('fr-FR') : '' },
                { header: 'Statut', accessor: r => r.lue ? 'Lue' : 'Non lue' }
              ]}
              fileName="alertes"
              reportTitle="Centre d'Alertes"
            />
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead}
              className="text-xs text-primary hover:text-accent font-medium transition-colors flex items-center gap-1">
              <Check className="w-3 h-3" /> Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Impossible de joindre l'API. Vérifiez que le backend est démarré sur le port 5000.
        </div>
      )}

      {alertes.length === 0 ? (
        <div className="text-center py-20 bg-white/2 border border-dashed border-[var(--border-color)] rounded-3xl">
          {apiError ? (
            <>
              <WifiOff className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)] font-medium">Backend inaccessible.</p>
              <p className="text-slate-600 text-sm mt-1">Démarrez le serveur Flask pour voir les alertes.</p>
            </>
          ) : (
            <>
              <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)] font-medium">Aucune alerte active.</p>
              <p className="text-slate-600 text-sm mt-1">Tout est sous contrôle !</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {alertes.map(alerte => {
            const id     = alerte.id || alerte.idAlerte;
            const type   = alerte.type || alerte.typeAlerte || 'CRITIQUE';
            const titre  = alerte.titre || alerte.message?.substring(0, 50) || 'Alerte';
            const msg    = alerte.message || alerte.description || '';
            const date   = alerte.date   || alerte.dateCreation || alerte.date_creation;
            const config = TYPE_CONFIG[type] || TYPE_CONFIG['CRITIQUE'];
            const Icon   = config.icon;

            return (
              <div key={id}
                className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200
                  ${alerte.lue
                    ? 'bg-white/2 border-[var(--border-color)] opacity-60'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] shadow-lg shadow-primary/5'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                  <Icon className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h4 className={`font-semibold text-sm ${alerte.lue ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                      {!alerte.lue && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-2 align-middle" />}
                      {titre}
                    </h4>
                    {date && (
                      <span className="text-[var(--text-muted)] text-[10px] whitespace-nowrap flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(date).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)] text-xs leading-relaxed mb-3">{msg}</p>
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleAgir(id)} className="text-primary hover:text-accent text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors">
                      Agir <ArrowRight className="w-3 h-3" />
                    </button>
                    {!alerte.lue && (
                      <button onClick={() => markAsRead(id)}
                        className="text-[var(--text-muted)] hover:text-emerald-400 text-[10px] font-medium transition-colors flex items-center gap-1">
                        <Check className="w-3 h-3" /> Marquer comme lu
                      </button>
                    )}
                  </div>
                </div>

                <button onClick={() => deleteAlerte(id)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all"
                  title="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
