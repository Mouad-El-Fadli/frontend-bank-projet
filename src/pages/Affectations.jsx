import { useState, useEffect, useCallback } from 'react';
import { affectationService } from '../api/api';
import { GitBranch, Search, Plus, ArrowRight, Building2, Loader2, WifiOff, Package } from 'lucide-react';
import { alerts } from '../utils/alerts';
import { useAuth } from '../contexts/AuthContext';
import ExportButton from '../components/ExportButton';

export default function Affectations() {
  const { canAccess } = useAuth();
  const [affectations, setAffectations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ idEquipement: '', idUtilisateur: '', dateDebut: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [equipements, setEquipements] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);

  const fetchAffectations = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const { data } = await affectationService.getAll();
      setAffectations(data.results || data || []);
    } catch (err) {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAffectations();
  }, [fetchAffectations]);

  const fetchFullAffectationsData = async () => {
    try {
      const { data } = await affectationService.getAll({ limit: 10000, pagination: false });
      return data.results || data || [];
    } catch {
      return affectations;
    }
  };

  useEffect(() => {
    if (modalOpen) {
      import('../api/api').then(({ equipmentService, utilisateurService }) => {
        equipmentService.getAll({ statut: 'DISPONIBLE' }).then(res => setEquipements(res.data.results || res.data || []));
        utilisateurService.getAll().then(res => setUtilisateurs(res.data.results || res.data || []));
      });
      setForm({ idEquipement: '', idUtilisateur: '', dateDebut: new Date().toISOString().split('T')[0] });
    }
  }, [modalOpen]);

  const filtered = affectations.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    const strMatch = [
      a.equipement?.modele,
      a.equipement?.marque,
      a.equipement?.numSerie,
      a.numeroSerie,
      a.agence?.nom,
      a.agence,
      a.utilisateur?.nom,
      a.employe
    ].join(' ').toLowerCase();
    return strMatch.includes(s);
  });

  const handleSave = async () => {
    if (!form.idEquipement || !form.idUtilisateur || !form.dateDebut) {
      return alerts.error('Champs requis', 'Veuillez sélectionner l\'équipement, l\'employé et la date.');
    }
    setSaving(true);
    try {
      await affectationService.create({
        idEquipement: Number(form.idEquipement),
        idUtilisateur: Number(form.idUtilisateur),
        dateDebut: form.dateDebut
      });
      alerts.success('Succès', 'Équipement affecté avec succès.');
      setModalOpen(false);
      fetchAffectations();
    } catch (err) {
      alerts.error('Erreur', err?.response?.data?.message || err?.response?.data?.error || 'Impossible de réaliser l\'affectation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[var(--text-primary)] font-bold text-xl">Affectations</h2>
          <p className="text-[var(--text-secondary)] text-sm">{filtered.length} affectation(s)</p>
        </div>
        <div className="flex gap-3">
          <div className="h-[42px]">
            <ExportButton 
              data={affectations}
              filteredData={filtered}
              fetchFullData={fetchFullAffectationsData}
              columns={[
                { header: 'Date Affectation', accessor: r => r.dateDebut || r.date_affectation || r.dateAffectation || '' },
                { header: 'Équipement', accessor: r => r.equipement?.modele || r.modele || r.equipement || '' },
                { header: 'Série', accessor: r => r.equipement?.numSerie || r.numeroSerie || r.numSerie || '' },
                { header: 'Agence', accessor: r => r.agence?.nom || r.agence || '' },
                { header: 'Responsable', accessor: r => typeof r.utilisateur === 'string' ? r.utilisateur : (r.employe || r.utilisateur?.nom || '') },
                { header: 'Technicien Gérant', accessor: r => r.agent_tech || r.technicien || '' }
              ]}
              fileName="affectations"
              reportTitle="Historique des Affectations"
            />
          </div>
          {canAccess('affectations') && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-accent text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20 h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle Affectation</span>
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

      <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-[var(--text-secondary)]" />
        <input
          className="bg-transparent text-sm text-[var(--text-primary)] placeholder-slate-500 outline-none w-full"
          placeholder="Série, agence, employé..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white/2 border border-dashed border-[var(--border-color)] rounded-3xl">
          <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] font-medium">Aucune affectation trouvée.</p>
          <p className="text-slate-600 text-sm mt-1">
            {apiError ? 'Erreur API — vérifiez le backend.' : 'Créez une nouvelle affectation.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id || a.idAffectation} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:bg-[var(--bg-card-hover)] transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs text-[var(--text-secondary)] font-mono">
                  {a.dateDebut || a.date_affectation || a.dateAffectation || '—'}
                </span>
              </div>
              <p className="text-[var(--text-primary)] font-semibold text-sm mb-0.5">
                {a.equipement || a.modele || a.equipement?.modele || 'Équipement'}
              </p>
              <p className="text-primary font-mono text-xs mb-3">
                {a.numeroSerie || a.numSerie || a.equipement?.numSerie || '—'}
              </p>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Building2 className="w-3.5 h-3.5" />
                <span className="truncate">{a.agence || a.agence?.nom || '—'}</span>
              </div>
              {(a.employe || a.utilisateur) && (
                <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--text-secondary)]">
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>{typeof a.utilisateur === 'string' ? a.utilisateur : (a.employe || a.utilisateur?.nom || '—')}</span>
                </div>
              )}
              {(a.agent_tech || a.technicien) && (
                <div className="mt-3 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                  Technicien : {a.agent_tech || a.technicien}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && canAccess('affectations') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-[var(--text-primary)] font-semibold mb-5">Nouvelle Affectation</h3>
            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Équipement (Disponible) *</label>
                <select value={form.idEquipement} onChange={e => setForm(f => ({ ...f, idEquipement: e.target.value }))}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all">
                  <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Sélectionnez un équipement...</option>
                  {equipements.map(eq => (
                    <option key={eq.idEquipement || eq.id} value={eq.idEquipement || eq.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      {eq.marque} {eq.modele} ({eq.numeroSerie})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Chef d'Agence (Responsable) *</label>
                <select value={form.idUtilisateur} onChange={e => setForm(f => ({ ...f, idUtilisateur: e.target.value }))}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all">
                  <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Sélectionnez le chef d'agence...</option>
                  {utilisateurs.filter(u => u.role === 'ROLE_AGENCE' || u.role?.nomRole === 'ROLE_AGENCE').map(u => (
                    <option key={u.idUtilisateur || u.id} value={u.idUtilisateur || u.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      {u.nom} {u.prenom} — {u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-secondary)] mb-1 block">Date d'Affectation *</label>
                <input type="date" value={form.dateDebut} onChange={e => setForm(f => ({ ...f, dateDebut: e.target.value }))}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setModalOpen(false); setForm({ equipement: '', agence: '', employe: '' }); }}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-accent text-[var(--text-primary)] text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Affecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
