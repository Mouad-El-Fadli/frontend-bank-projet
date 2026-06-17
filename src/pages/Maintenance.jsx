import { useState, useEffect, useCallback } from 'react';
import { maintenanceService, equipmentService } from '../api/api';
import { chatbotService } from '../api/api';
import {
  Wrench, Plus, CheckCircle, Clock, AlertTriangle,
  Search, ChevronDown, Calendar, User, Clipboard,
  WifiOff, Package, Loader2, RefreshCw, ShieldAlert
} from 'lucide-react';
import ExportButton from '../components/ExportButton';
import { useAuth } from '../contexts/AuthContext';
import { alerts } from '../utils/alerts';

const STATUT_COLORS = {
  'EN_MAINTENANCE': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  'EN_PANNE':       'text-red-400 bg-red-400/10 border-red-400/20',
  'DISPONIBLE':     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'AFFECTE':        'text-primary bg-primary/10 border-primary/20',
};

const STATUT_LABELS = {
  'EN_MAINTENANCE': 'En Maintenance',
  'EN_PANNE':       'En Panne',
  'DISPONIBLE':     'Disponible',
  'AFFECTE':        'Affecté',
};

const ResolutionPanneModal = ({ eq, onClose, onConfirm, loading }) => {
  const [form, setForm] = useState({ titre: '', descriptionPanne: '', resolution: '' });
  const handleConfirm = () => {
    if (!form.titre || !form.descriptionPanne || !form.resolution) return alerts.error('Erreur', 'Tous les champs sont obligatoires.');
    onConfirm(form);
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-primary" /> Résolution Technique
        </h3>
        <p className="text-[var(--text-secondary)] text-xs mb-4">Équipement : {eq.modele} ({eq.numeroSerie})</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Titre de la panne *</label>
            <input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
              placeholder="Ex: Remplacement du disque dur"
              className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Symptômes observés *</label>
            <textarea value={form.descriptionPanne} onChange={e => setForm(f => ({ ...f, descriptionPanne: e.target.value }))}
              rows={2} placeholder="Description du problème vu sur place..."
              className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 resize-none" />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">Résolution appliquée *</label>
            <textarea value={form.resolution} onChange={e => setForm(f => ({ ...f, resolution: e.target.value }))}
              rows={3} placeholder="Ce qui a été fait pour régler le problème. (Alimente l'IA)"
              className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 resize-none" />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)]">Annuler</button>
          <button onClick={handleConfirm} disabled={loading} className="px-5 py-2 rounded-xl bg-primary text-[var(--text-primary)] text-sm font-medium hover:bg-accent flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Clôturer et remettre en service
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Maintenance() {
  const { hasRole } = useAuth();
  const [enMaintenance, setEnMaintenance] = useState([]);
  const [enPanne, setEnPanne]             = useState([]);
  const [alertes, setAlertes]             = useState({ garantiesExpirees: [], amortissementsDepasses: [] });
  const [loading, setLoading]             = useState(true);
  const [apiError, setApiError]           = useState(false);
  const [search, setSearch]               = useState('');
  const [activeTab, setActiveTab]         = useState('maintenance'); // 'maintenance' | 'panne' | 'alertes'
  
  const [resolutionTarget, setResolutionTarget] = useState(null);
  const [resolveLoading, setResolveLoading]     = useState(false);
  const [ragIndexing, setRagIndexing]           = useState(false);
  const [signalerModal, setSignalerModal]       = useState(false);
  const [signalerForm, setSignalerForm]         = useState({ idEquipement: '', notes: '' });
  const [allEquipements, setAllEquipements]     = useState([]);
  const [signalerLoading, setSignalerLoading]   = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [maintRes, panneRes, alertesRes] = await Promise.allSettled([
        maintenanceService.getEnMaintenance(),
        maintenanceService.getEnPanne(),
        maintenanceService.getAlertes(),
      ]);

      if (maintRes.status === 'fulfilled') {
        const d = maintRes.value.data;
        setEnMaintenance(Array.isArray(d) ? d : (d?.results || []));
      }
      if (panneRes.status === 'fulfilled') {
        const d = panneRes.value.data;
        setEnPanne(Array.isArray(d) ? d : (d?.results || []));
      }
      if (alertesRes.status === 'fulfilled') {
        const d = alertesRes.value.data;
        // Le backend retourne { garantiesExpirees: [...], amortissementsDepasses: [...] }
        if (d && (d.garantiesExpirees || d.amortissementsDepasses)) {
          setAlertes({
            garantiesExpirees:     d.garantiesExpirees     || [],
            amortissementsDepasses: d.amortissementsDepasses || [],
          });
        }
      }

      // Erreur si tous échouent
      // Stocker le message précis
      let errMsg = '';
      if (maintRes.status === 'rejected') errMsg = maintRes.reason?.response?.data?.error || maintRes.reason?.message || 'Erreur inconnue';
      
      if (maintRes.status === 'rejected' && panneRes.status === 'rejected') {
        setApiError(errMsg || true);
      }
    } catch (err) {
      setApiError(err?.response?.data?.error || err?.message || true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Données affichées selon l'onglet actif
  const rawData = activeTab === 'maintenance' ? enMaintenance
    : activeTab === 'panne'    ? enPanne
    : [...(alertes.garantiesExpirees || []), ...(alertes.amortissementsDepasses || [])];

  const filtered = rawData.filter(eq =>
    !search ||
    eq.numeroSerie?.toLowerCase().includes(search.toLowerCase()) ||
    eq.modele?.toLowerCase().includes(search.toLowerCase()) ||
    eq.marque?.toLowerCase().includes(search.toLowerCase()) ||
    eq.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const handleResolvePanne = async (data) => {
    setResolveLoading(true);
    try {
      await maintenanceService.resoudrePanne(resolutionTarget.idEquipement || resolutionTarget.id, data);
      alerts.success('Succès', 'Panne résolue avec succès. L\'IA apprend de cette résolution...');
      setResolutionTarget(null);
      setRagIndexing(true);
      fetchAll();
      // Polling : vérifier quand la réindexation est terminée
      const poll = setInterval(async () => {
        try {
          const { data: st } = await chatbotService.indexingStatus();
          if (!st.is_indexing) {
            clearInterval(poll);
            setRagIndexing(false);
          }
        } catch { clearInterval(poll); setRagIndexing(false); }
      }, 3000);
      // Sécurité : timeout après 60s
      setTimeout(() => { clearInterval(poll); setRagIndexing(false); }, 60000);
    } catch (err) {
      alerts.error('Erreur', err?.response?.data?.error || 'Opération échouée.');
    } finally {
      setResolveLoading(false);
    }
  };

  // Charger tous les équipements actifs pour le formulaire de signalement
  useEffect(() => {
    equipmentService.getAll({})
      .then(r => setAllEquipements(Array.isArray(r.data) ? r.data.filter(e => !['EN_PANNE','RETIRE'].includes(e.statut)) : []))
      .catch(() => setAllEquipements([]));
  }, []);

  const handleSignalerPanne = async () => {
    if (!signalerForm.idEquipement) return alerts.error('Erreur', 'Sélectionnez un équipement.');
    setSignalerLoading(true);
    try {
      await equipmentService.update(signalerForm.idEquipement, {
        statut: 'EN_PANNE',
        ...(signalerForm.notes ? { notes: signalerForm.notes } : {})
      });
      alerts.success('Panne signalée', "L'équipement a été marqué EN PANNE.");
      setSignalerModal(false);
      setSignalerForm({ idEquipement: '', notes: '' });
      fetchAll();
    } catch (err) {
      alerts.error('Erreur', err?.response?.data?.error || 'Impossible de signaler la panne.');
    } finally {
      setSignalerLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[var(--text-primary)] font-bold text-2xl flex items-center gap-3">
            <Wrench className="w-6 h-6 text-primary" /> Maintenance
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Équipements en maintenance et en panne</p>
          {ragIndexing && (
            <div className="flex items-center gap-2 mt-2 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-lg w-fit">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="text-primary text-xs font-medium">L'IA apprend de cette résolution...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[42px]">
            <ExportButton 
              data={rawData}
              filteredData={filtered}
              fetchFullData={async () => rawData} // Données déjà complètes sans pagination pour ces endpoints
              columns={[
                { header: 'ID', accessor: r => r.idEquipement || r.id },
                { header: 'N° Série', accessor: 'numeroSerie' },
                { header: 'Modèle', accessor: 'modele' },
                { header: 'Marque', accessor: 'marque' },
                { header: 'Statut', accessor: (row) => STATUT_LABELS[row.statut || 'EN_MAINTENANCE'] || row.statut },
                { header: 'Type', accessor: r => r.type?.libelle || r.type || '' },
                { header: 'Agence', accessor: r => r.agence?.nom || r.agence || '' },
                { header: 'Date Achat', accessor: r => r.dateAchat || '' },
                { header: 'Fin Garantie', accessor: r => r.finGarantie || '' }
              ]}
              fileName={`maintenance-${activeTab}`}
              reportTitle={`Rapport Maintenance - ${activeTab.toUpperCase()}`}
            />
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-3 py-2.5 h-[42px] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>
          <button
            onClick={() => setSignalerModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 h-[42px] bg-primary hover:bg-accent text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Signaler une Panne</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          {typeof apiError === 'string' ? `Erreur API: ${apiError}` : "Impossible de joindre l'API. Vérifiez que le backend Flask est démarré sur le port 5000."}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`bg-[var(--bg-card)] border rounded-2xl p-5 text-left transition-all hover:bg-[var(--bg-card-hover)]
            ${activeTab === 'maintenance' ? 'border-amber-500/40 ring-1 ring-amber-500/30' : 'border-[var(--border-color)]'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            {activeTab === 'maintenance' && (
              <span className="text-xs text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded-full">Actif</span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">En Maintenance</p>
          <p className="text-[var(--text-primary)] text-2xl font-bold mt-1">{enMaintenance.length}</p>
        </button>

        <button
          onClick={() => setActiveTab('panne')}
          className={`bg-[var(--bg-card)] border rounded-2xl p-5 text-left transition-all hover:bg-[var(--bg-card-hover)]
            ${activeTab === 'panne' ? 'border-red-500/40 ring-1 ring-red-500/30' : 'border-[var(--border-color)]'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            {activeTab === 'panne' && (
              <span className="text-xs text-red-400 font-medium bg-red-400/10 px-2 py-0.5 rounded-full">Actif</span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">En Panne</p>
          <p className="text-[var(--text-primary)] text-2xl font-bold mt-1">{enPanne.length}</p>
        </button>

        <button
          onClick={() => setActiveTab('alertes')}
          className={`bg-[var(--bg-card)] border rounded-2xl p-5 text-left transition-all hover:bg-[var(--bg-card-hover)]
            ${activeTab === 'alertes' ? 'border-primary/40 ring-1 ring-primary/30' : 'border-[var(--border-color)]'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-primary" />
            </div>
            {activeTab === 'alertes' && (
              <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">Actif</span>
            )}
          </div>
          <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">Alertes Garantie</p>
          <p className="text-[var(--text-primary)] text-2xl font-bold mt-1">
            {(alertes.garantiesExpirees?.length || 0) + (alertes.amortissementsDepasses?.length || 0)}
          </p>
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-[var(--text-secondary)]" />
        <input
          className="bg-transparent text-sm text-[var(--text-primary)] placeholder-slate-500 outline-none w-full"
          placeholder="N° de série, modèle, marque..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white/2 border border-dashed border-[var(--border-color)] rounded-3xl">
          {activeTab === 'maintenance' ? (
            <>
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)] font-medium">Aucun équipement en maintenance.</p>
              <p className="text-slate-600 text-sm mt-1">Tout le parc est opérationnel.</p>
            </>
          ) : activeTab === 'panne' ? (
            <>
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)] font-medium">Aucun équipement en panne.</p>
              <p className="text-slate-600 text-sm mt-1">Aucune panne signalée.</p>
            </>
          ) : (
            <>
              <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-[var(--text-secondary)] font-medium">Aucune alerte de garantie.</p>
              <p className="text-slate-600 text-sm mt-1">Toutes les garanties sont valides.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(eq => {
            const id       = eq.idEquipement || eq.id;
            const statut   = eq.statut || 'EN_MAINTENANCE';
            const isAlerte = activeTab === 'alertes';

            return (
              <div key={id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 hover:bg-[var(--bg-card-hover)] transition-all group">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUT_COLORS[statut] || 'text-[var(--text-secondary)] bg-slate-400/10 border-slate-400/20'}`}>
                      {STATUT_LABELS[statut] || statut}
                    </span>
                    {isAlerte && eq === alertes.garantiesExpirees?.find(x => x.idEquipement === id) && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border text-orange-400 bg-orange-400/10 border-orange-400/20">
                        Garantie Exp.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-muted)] text-xs font-mono">#{id}</span>
                  </div>
                </div>

                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-[var(--text-primary)] font-semibold text-lg">
                    {eq.modele || 'Équipement inconnu'}
                  </h3>
                  {hasRole('ROLE_TECHNICIEN') && (statut === 'EN_PANNE' || statut === 'EN_MAINTENANCE') && (
                    <button onClick={() => setResolutionTarget(eq)}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3" /> Traiter
                    </button>
                  )}
                </div>
                <p className="text-primary text-xs font-mono mb-2">
                  {eq.numeroSerie || '—'}
                </p>
                <p className="text-[var(--text-secondary)] text-sm mb-5 leading-relaxed">
                  {eq.notes || eq.description || (isAlerte ? 'Garantie ou amortissement dépassé.' : 'En cours de traitement.')}
                </p>

                <div className="grid grid-cols-2 gap-y-3 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Clipboard className="w-3.5 h-3.5" />
                    <span>{eq.type?.libelle || eq.type || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {eq.dateAchat
                        ? new Date(eq.dateAchat).toLocaleDateString('fr-FR')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <User className="w-3.5 h-3.5" />
                    <span className="truncate">{eq.agence?.nom || eq.agence || '—'}</span>
                  </div>
                  {eq.finGarantie && (
                    <div className="flex items-center gap-2 text-xs text-orange-400">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Garantie : {new Date(eq.finGarantie).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolutionTarget && (
        <ResolutionPanneModal 
          eq={resolutionTarget} 
          onClose={() => setResolutionTarget(null)} 
          onConfirm={handleResolvePanne} 
          loading={resolveLoading} 
        />
      )}

      {/* Modale Signaler une Panne */}
      {signalerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-[var(--text-primary)] font-semibold mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Signaler une Panne
            </h3>
            <p className="text-[var(--text-secondary)] text-xs mb-5">L'équipement sélectionné sera marqué comme EN PANNE.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Équipement concerné *</label>
                <select
                  value={signalerForm.idEquipement}
                  onChange={e => setSignalerForm(f => ({ ...f, idEquipement: e.target.value }))}
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-red-500/50"
                >
                  <option value="">-- Sélectionner un équipement --</option>
                  {allEquipements.map(e => (
                    <option key={e.idEquipement} value={e.idEquipement}>
                      {e.marque} {e.modele} — {e.numeroSerie} ({e.statut})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Description du problème (optionnel)</label>
                <textarea
                  value={signalerForm.notes}
                  onChange={e => setSignalerForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="Décrivez le symptôme observé..."
                  className="w-full bg-black/20 border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-red-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSignalerModal(false)} className="px-4 py-2 rounded-xl text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)]">
                Annuler
              </button>
              <button
                onClick={handleSignalerPanne}
                disabled={signalerLoading || !signalerForm.idEquipement}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {signalerLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Confirmer la Panne
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
