import { useCallback, useEffect, useState } from 'react';
import { historyService } from '../api/api';
import { Loader2, Search, WifiOff, Activity, Calendar, User, Hash, Clock, ArrowRight } from 'lucide-react';
import ExportButton from '../components/ExportButton';

const ACTION_LABELS = {
  'CREATION':           'Entrée en Stock',
  'MODIFICATION':       'Mise à jour Info',
  'AFFECTATION':        'Affectation Agence',
  'RESTITUTION':        'Retour au Stock',
  'MISE_HS':            'Mise Hors Service',
  'DEMANDE_RESOLUE':    'Résolution de Demande',
  'DEMANDE_CREEE':      'Besoin Signalé',
  'LOGIN':              'Connexion',
};

const ACTION_COLORS = {
  'CREATION':           'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
  'MODIFICATION':       'text-blue-400 bg-blue-400/10 border-blue-500/20',
  'AFFECTATION':        'text-primary bg-primary/10 border-primary/20',
  'RESTITUTION':        'text-amber-400 bg-amber-400/10 border-amber-500/20',
  'MISE_HS':            'text-red-400 bg-red-400/10 border-red-500/20',
  'DEMANDE_RESOLUE':    'text-emerald-400 bg-emerald-400/10 border-emerald-500/20',
  'DEMANDE_CREEE':      'text-purple-400 bg-purple-400/10 border-purple-500/20',
};

export default function Historique() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [query, setQuery] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const { data } = await historyService.getAll({ search: query });
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur Historique:", err);
      setApiError(true);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => fetchLogs(), 300);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-[var(--text-primary)] font-bold text-2xl flex items-center gap-3">
            <Activity className="w-7 h-7 text-primary" />
            Historique du Cycle de Vie
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1 leading-relaxed max-w-2xl">
            <strong>Rôle :</strong> Tracé complet de chaque équipement. De son entrée en stock à son retrait, en passant par les affectations, les pannes et les interventions techniques. Garantit la transparence et la responsabilité de chaque action.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="h-[42px] w-full sm:w-auto">
            <ExportButton 
              data={logs}
              filteredData={logs}
              columns={[
                { header: 'Date', accessor: 'horodatage' },
                { header: 'Action', accessor: r => ACTION_LABELS[r.action] || r.action },
                { header: 'Acteur', accessor: 'utilisateur' },
                { header: 'Série Équipement', accessor: 'equipement' },
                { header: 'Détails', accessor: r => typeof r.detailsJson === 'object' ? JSON.stringify(r.detailsJson) : r.detailsJson }
              ]}
              fileName="cycle-de-vie-parc"
              reportTitle="Historique Complet du Parc IT"
            />
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="w-5 h-5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full bg-black/20 border border-[var(--border-color)] pl-10 pr-4 py-3 rounded-xl text-sm text-[var(--text-primary)] placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            placeholder="Filtrer par n° de série, acteur ou type d'action..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Impossible de charger le journal d'activité. Vérifiez la connexion au serveur.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="text-xs text-[var(--text-secondary)] font-medium">Récupération des données auditées...</span>
          </div>
        </div>
      ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-[var(--bg-card)] border border-dashed border-[var(--border-color)] rounded-2xl">
            <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-[var(--text-secondary)] font-medium">Aucun historique trouvé pour cette recherche.</p>
          </div>
      ) : (
        <div className="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-px before:bg-[var(--border-color)]">
          {logs.map((log, idx) => (
            <div key={log.idHistorique || idx} className="relative pl-14 transition-all hover:translate-x-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--bg-card)] border-2 border-primary z-10 shadow-sm" />
              
              <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`shrink-0 p-2.5 rounded-xl border ${ACTION_COLORS[log.action] || 'text-slate-400 bg-slate-400/10 border-slate-500/20'}`}>
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[var(--text-primary)] font-bold">{ACTION_LABELS[log.action] || log.action}</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-medium italic">
                        <User className="w-3 h-3" /> {log.utilisateur || 'Système'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {log.equipement && (
                        <span className="text-blue-400 font-mono flex items-center gap-1 bg-blue-500/5 px-2 py-0.5 rounded-md border border-blue-500/10">
                          <Hash className="w-3 h-3" /> {log.equipement}
                        </span>
                      )}
                      <span className="text-[var(--text-muted)] flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {log.horodatage ? new Date(log.horodatage).toLocaleDateString('fr-FR') + ' à ' + new Date(log.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : 'Date inconnue'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:border-l md:border-[var(--border-color)] md:pl-5">
                  <div className="text-xs text-[var(--text-secondary)] italic max-w-sm">
                    {typeof log.detailsJson === 'object' && log.detailsJson !== null
                      ? (log.detailsJson.nouveauStatut ? `Nouveau statut: ${log.detailsJson.nouveauStatut}` : 
                         log.detailsJson.idDemande ? `Demande n°${log.detailsJson.idDemande}` :
                         JSON.stringify(log.detailsJson))
                      : log.detailsJson || 'Action standard enregistrée.'}
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
