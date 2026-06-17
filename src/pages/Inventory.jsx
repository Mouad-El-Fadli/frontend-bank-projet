import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../api/api';
import {
  ClipboardCheck, Plus, Scan, FileBarChart, History,
  Search, ChevronDown, Box, MapPin, CheckCircle2,
  Loader2, WifiOff, Package, Calendar
} from 'lucide-react';
import ExportButton from '../components/ExportButton';

export default function Inventory() {
  // PFE: pas d'endpoint "sessions d'inventaire" dédié → on affiche les équipements
  // et on les présente comme un historique (même format camelCase que le backend).
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const { data } = await inventoryService.getSessions();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setSessions(list);
    } catch {
      setApiError(true);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const fetchFullSessionsData = async () => {
    try {
      const { data } = await inventoryService.getSessions({ limit: 10000, pagination: false });
      return Array.isArray(data) ? data : (data?.results || []);
    } catch {
      return sessions;
    }
  };

  // Backend statuts: DISPONIBLE, AFFECTE, EN_PANNE, EN_MAINTENANCE, RETIRE
  const activeSession = null; // pas de notion de session "EN_COURS" côté backend
  const closedCount   = sessions.filter(s => (s.statut || '').toUpperCase() === 'RETIRE').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-bold text-2xl flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-primary" /> Sessions d'Inventaire
          </h2>
          <p className="text-slate-400 text-sm mt-1">Audit physique et rapprochement du parc matériel</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[42px]">
            <ExportButton 
              data={sessions}
              filteredData={sessions}
              fetchFullData={fetchFullSessionsData}
              columns={[
                { header: 'N° Série', accessor: 'numeroSerie' },
                { header: 'Modèle', accessor: 'modele' },
                { header: 'Marque', accessor: 'marque' },
                { header: 'Agence', accessor: 'agence' },
                { header: 'Statut', accessor: 'statut' },
                { header: 'Date', accessor: r => r.creeLe || r.dateAchat || '' }
              ]}
              fileName="inventaire"
              reportTitle="Rapport d'Inventaire"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-accent text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20 h-[42px]">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Nouvelle Session</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Impossible de joindre l'API. Vérifiez que le backend est démarré sur le port 5000.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <>
          {/* Hero Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeSession ? (
              <div className="bg-gradient-to-br from-primary to-secondary rounded-3xl p-6 text-white shadow-xl shadow-primary/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 transform scale-150 group-hover:rotate-12 transition-transform">
                  <Scan className="w-24 h-24" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold mb-1">Session Active</h3>
                  <p className="text-orange-100 text-xs mb-6">{activeSession.nom || activeSession.libelle}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-bold">{activeSession.scanne ?? activeSession.nbScanne ?? '0'}</span>
                    <span className="text-orange-200 text-sm mb-1">/ {activeSession.total ?? activeSession.nbTotal ?? '0'} scannés</span>
                  </div>
                  <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden mb-6">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-1000"
                      style={{ width: `${activeSession.progress ?? 0}%` }}
                    />
                  </div>
                  <button className="bg-white text-primary px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-50 shadow-lg transition-all flex items-center gap-2">
                    <Scan className="w-4 h-4" /> Continuer le Scan
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-6 flex items-center justify-center">
                <div className="text-center">
                  <Scan className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium">Aucune session active</p>
                  <p className="text-slate-600 text-sm mt-1">Créez une nouvelle session d'inventaire</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
                <History className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-slate-500 text-xs font-medium uppercase">Sessions Closes</p>
                <p className="text-white text-2xl font-bold mt-1">{closedCount}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
                <FileBarChart className="w-8 h-8 text-slate-400 mb-3" />
                <p className="text-slate-500 text-xs font-medium uppercase">Total Sessions</p>
                <p className="text-white text-2xl font-bold mt-1">{sessions.length}</p>
              </div>
            </div>
          </div>

          {/* Sessions List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Historique des Sessions</h3>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input className="bg-transparent text-xs text-white outline-none placeholder-slate-500" placeholder="Rechercher..." />
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-16 bg-white/2 border border-dashed border-white/10 rounded-3xl">
                <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Aucun équipement trouvé.</p>
                <p className="text-slate-600 text-sm mt-1">
                  {apiError ? 'Erreur API — vérifiez le backend.' : 'Créez votre première session.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {sessions.map(s => (
                  <div
                    key={s.idEquipement || s.id || s.numeroSerie}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5">
                        <Box className="w-6 h-6 text-slate-300" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">
                          {s.modele || 'Équipement'} {s.marque ? `— ${s.marque}` : ''}
                        </h4>
                        <div className="flex items-center gap-3 text-slate-500 text-xs mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {s.creeLe || s.dateAchat || '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {s.agence || '—'}
                          </span>
                        </div>
                        <div className="text-slate-600 text-[10px] mt-1 font-mono">
                          {s.numeroSerie || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          (s.statut || '').toUpperCase() === 'RETIRE'
                            ? 'text-slate-300 border-slate-500/30'
                            : 'text-amber-400 border-amber-500/30'
                        }`}>
                          {s.statut || '—'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[10px]">{s.typeMateriel || '—'}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                      <button className="flex-1 md:flex-none px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-medium transition-all">
                        Rapport PDF
                      </button>
                      <button className="p-2 rounded-xl hover:bg-white/5 text-slate-400 transition-all">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeSession && (
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <h4 className="text-amber-400 text-sm font-semibold mb-1">Rapprochement en cours</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Session active détectée. Vérifiez l'emplacement physique des équipements non encore scannés.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
