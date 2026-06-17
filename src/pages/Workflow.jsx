import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { workflowService, documentService } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Check, X, Clock, ChevronDown, Loader2, FileText,
  AlertCircle, Pen, Send, WifiOff
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { alerts } from '../utils/alerts';
import ExportButton from '../components/ExportButton';

const URGENCES = ['Normale', 'Urgente', 'Critique'];
const CATEGORIES = ['Demande de Matériel', 'Dépannage / Incident'];
const TYPES    = ['Ordinateur', 'Imprimante', 'Serveur', 'Switch', 'Téléphone', 'Autre'];

// Mapping statut backend → affichage
const STATUT_DISPLAY = {
  'EN_ATTENTE': 'En attente',
  'APPROUVEE':  'Approuvée',
  'REJETEE':    'Rejetée',
  'EN_COURS':   'En cours',
  'En attente': 'En attente',
  'Approuvée':  'Approuvée',
  'Rejetée':    'Rejetée',
  'En cours':   'En cours',
};

const STATUT_CONFIG = {
  'En attente': { color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: Clock },
  'Approuvée':  { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Check },
  'Rejetée':    { color: 'bg-red-500/10 text-red-400 border-red-500/20',         icon: X },
  'En cours':   { color: 'bg-primary/10 text-primary border-primary/20',          icon: FileText },
};

const URGENCE_COLORS = {
  Normale:  'text-[var(--text-secondary)]',
  Urgente:  'text-amber-400',
  Critique: 'text-red-400',
};

import { utilisateurService } from '../api/api';

const AffectationModal = ({ onConfirm, onClose, loading, currentUser }) => {
  const [techs, setTechs] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    utilisateurService.getAll().then(({ data }) => {
      setTechs((data || []).filter(u => {
        if (u.role !== 'ROLE_TECHNICIEN') return false;
        if (currentUser?.role === 'ROLE_ADMIN') return true;
        return String(u.idSuccursale) === String(currentUser?.idSuccursale);
      }));
    }).catch(() => {});
  }, [currentUser]);

  const handleConfirm = () => {
    if (!selectedTech) return alerts.error('Erreur', 'Veuillez sélectionner un technicien.');
    onConfirm({ technicien_id: Number(selectedTech), instructions });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-[var(--text-primary)] font-semibold">Validation & Affectation</h3>
            <p className="text-[var(--text-secondary)] text-xs">Assignez cette demande à un technicien</p>
          </div>
        </div>
        <div className="mb-6">
          <label className="text-xs text-[var(--text-secondary)] mb-2 block font-medium">Technicien Régional</label>
          <div className="relative">
            <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)}
              className="appearance-none w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all">
              <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Sélectionnez un technicien...</option>
              {techs.map(t => <option key={t.idUtilisateur} value={t.idUtilisateur} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{t.prenom} {t.nom}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          </div>
        </div>
        <div className="mb-6">
          <label className="text-xs text-[var(--text-secondary)] mb-2 block font-medium">Instructions (Ordre de mission)</label>
          <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
            placeholder="Ex: Pense à vérifier le câble d'alimentation..." rows={2}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-emerald-500/50 resize-none transition-all placeholder-slate-500" />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] transition-all">Annuler</button>
          <button onClick={handleConfirm} disabled={loading || !selectedTech} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[var(--text-primary)] text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Affecter
          </button>
        </div>
      </div>
    </div>
  );
};

const ResoudreModal = ({ onConfirm, onClose, loading, target }) => {
  const [equipements, setEquipements] = useState([]);
  const [selectedEquip, setSelectedEquip] = useState('');
  const [note, setNote] = useState('');

  const requiresEquip = target?.motif?.includes('Catégorie: Demande de Matériel') || (!target?.motif?.includes('Catégorie:')); // Backward compat

  useEffect(() => {
    import('../api/api').then(({ equipmentService }) => {
      equipmentService.getAll({ statut: 'DISPONIBLE' }).then(({ data }) => {
        setEquipements(data.results || data || []);
      }).catch(() => {});
    });
  }, []);

  const handleConfirm = () => {
    if (requiresEquip && !selectedEquip) return alerts.error('Erreur', 'Ceci est une demande de matériel. Vous devez obligatoirement sélectionner l\'équipement fourni.');
    if (!note.trim()) return alerts.error('Erreur', 'La note de résolution est obligatoire.');
    onConfirm({ idEquipement: selectedEquip ? Number(selectedEquip) : null, note_resolution: note });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Pen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-[var(--text-primary)] font-semibold">Résoudre la demande</h3>
            <p className="text-[var(--text-secondary)] text-xs">Demande #{target?.idDemande || target?.id}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-[var(--text-secondary)] mb-2 block font-medium">
            Équipement fourni {requiresEquip ? '(* Obligatoire)' : '(Facultatif)'}
          </label>
          <div className="relative">
            <select value={selectedEquip} onChange={e => setSelectedEquip(e.target.value)}
              className="appearance-none w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all">
              <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">-- Aucun matériel fourni --</option>
              {equipements.map(e => <option key={e.idEquipement || e.id} value={e.idEquipement || e.id} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{e.marque} {e.modele} ({e.numeroSerie})</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          </div>
          {!requiresEquip && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5 ml-1">Laissez vide si c'est un simple dépannage ou intervention.</p>
          )}
        </div>

        <div className="mb-5">
          <label className="text-xs text-[var(--text-secondary)] mb-2 block font-medium">Note de résolution *</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Ex: Poste reconfiguré et installé à l'agence..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all min-h-[80px]"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] transition-all">Annuler</button>
          <button onClick={handleConfirm} disabled={loading || !note.trim()} className="px-5 py-2 rounded-xl bg-primary hover:bg-accent text-[var(--text-primary)] text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Clôturer
          </button>
        </div>
      </div>
    </div>
  );
};

const NewRequestForm = ({ onSubmit, loading }) => {
  const [form, setForm] = useState({ categorie: 'Demande de Matériel', type_materiel: 'Ordinateur', quantite: 1, urgence: 'Normale', description: '' });

  const handleSubmit = () => {
    if (!form.description.trim()) return alerts.error('Champ requis', 'Veuillez décrire votre besoin.');
    onSubmit(form);
    setForm({ categorie: 'Demande de Matériel', type_materiel: 'Ordinateur', quantite: 1, urgence: 'Normale', description: '' });
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-[var(--text-primary)] font-semibold">Nouvelle Requête</h2>
          <p className="text-[var(--text-secondary)] text-xs">Exprimez votre besoin au Manager IT</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Catégorie</label>
          <div className="relative">
            <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
              className="appearance-none w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all">
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Type de Matériel</label>
          <div className="relative">
            <select value={form.type_materiel} onChange={e => setForm(f => ({ ...f, type_materiel: e.target.value }))}
              className="appearance-none w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all">
              {TYPES.map(t => <option key={t} value={t} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Quantité</label>
          <input type="number" min={1} max={99} value={form.quantite}
            onChange={e => setForm(f => ({ ...f, quantite: parseInt(e.target.value) || 1 }))}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all" />
        </div>
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Niveau d'Urgence</label>
          <div className="relative">
            <select value={form.urgence} onChange={e => setForm(f => ({ ...f, urgence: e.target.value }))}
              className="appearance-none w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-primary/50 transition-all">
              {URGENCES.map(u => <option key={u} value={u} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{u}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          </div>
        </div>
      </div>
      <div className="mb-5">
        <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Justification / Description *</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={3} placeholder="Expliquez le besoin, le contexte, l'urgence..."
          className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-blue-500/50 resize-none transition-all placeholder-slate-500" />
      </div>
      <button onClick={handleSubmit} disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-accent text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Soumettre la Demande
      </button>
    </div>
  );
};

export default function Workflow() {
  const { canAccess, hasRole, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [signatureTarget, setSignatureTarget] = useState(null);
  const [sigLoading, setSigLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [resolvedTarget, setResolvedTarget] = useState(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [filterStatut, setFilterStatut] = useState('');

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const { data } = await workflowService.getDemandes();
      setDemandes(data.results || data || []);
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Erreur de connexion à l'API";
      setApiError(errorMsg);
      setDemandes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

  useEffect(() => {
    if (demandes.length > 0 && location.state?.openResolveModal && location.state?.targetId) {
      const target = demandes.find(d => String(d.idDemande) === String(location.state.targetId) || String(d.id) === String(location.state.targetId));
      if (target) {
        setResolvedTarget(target);
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [demandes, location.state, navigate, location.pathname]);

  // Normalise le statut backend vers l'affichage
  const normalizeStatut = (statut) => STATUT_DISPLAY[statut] || statut || 'En attente';

  const handleSubmitRequest = async (formData) => {
    setSubmitLoading(true);
    try {
      // Backend attend { motif } — on mappe le formulaire UI vers un motif unique
      const motif = [
        `Catégorie: ${formData.categorie}`,
        `Type: ${formData.type_materiel}`,
        `Quantité: ${formData.quantite}`,
        `Urgence: ${formData.urgence}`,
        '',
        formData.description,
      ].join('\n');

      const { data } = await workflowService.createDemande({ motif });
      setDemandes(prev => [data, ...prev]);
      alerts.success('Succès', 'Demande soumise avec succès !');
    } catch (err) {
      alerts.error('Erreur', err?.response?.data?.error || err?.response?.data?.message || 'Impossible de soumettre la demande. Vérifiez le backend.');
    } finally {
      setSubmitLoading(false); }
  };

  const handleApprove = async (data) => {
    setSigLoading(true);
    try {
      if (!data.technicien_id) throw new Error("Veuillez sélectionner un technicien.");
      await workflowService.affecterDemande(signatureTarget, data);
      
      setDemandes(d => d.map(item => ((item.idDemande || item.id) === signatureTarget) ? { ...item, statut: 'AFFECTE', idTechnicien: data.technicien_id, commentaireValidation: data.instructions } : item));
      alerts.success('Affectation', 'Demande approuvée et affectée au technicien avec succès !');
    } catch (err) {
      alerts.error('Erreur', err?.response?.data?.error || err?.response?.data?.message || err.message || 'Impossible d\'affecter la demande.');
    } finally {
      setSigLoading(false);
      setSignatureTarget(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return alerts.error('Erreur', 'Veuillez saisir un motif de rejet.');
    try {
      await workflowService.refuserDemande(rejectModal, { commentaire: rejectReason });
      alerts.success('Succès', 'Demande rejetée.');
      setRejectModal(null);
      setRejectReason('');
      fetchDemandes();
    } catch (err) {
      alerts.error('Erreur', err?.response?.data?.error || 'Opération échouée.');
    }
  };

  const handleResolve = async (data) => {
    setResolveLoading(true);
    try {
      const targetId = resolvedTarget?.idDemande || resolvedTarget?.id;
      if (!targetId) throw new Error("ID de demande invalide");

      await workflowService.resoudreDemande(targetId, data);
      alerts.success('Succès', 'Intervention clôturée avec succès et équipement affecté !');
      setResolvedTarget(null);
      fetchDemandes();
    } catch (err) {
      alerts.error('Erreur', err?.response?.data?.error || 'Opération échouée.');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleDownloadPV = async (demandeId) => {
    try {
      const response = await documentService.getPV(demandeId);
      
      // Si la réponse est OK, on télécharge
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PV_Livraison_${demandeId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erreur de téléchargement PV:", err);
      
      // Tentative de lecture du message d'erreur si c'est un blob
      if (err.response?.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result);
            alerts.error('Erreur', errorData.error || errorData.message || 'Impossible de télécharger le PV.');
          } catch {
            alerts.error('Erreur', 'Impossible de télécharger le PV. Le fichier est peut-être corrompu.');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Impossible de télécharger le PV. Vérifiez que la demande est résolue.';
        alerts.error('Erreur', errorMsg);
      }
    }
  };

  const filtered = demandes.filter(d => {
    if (!filterStatut) return true;
    const display = normalizeStatut(d.statut);
    return display === filterStatut || d.statut === filterStatut;
  });

  const countByStatut = (target) => demandes.filter(d => normalizeStatut(d.statut) === target).length;

  const fetchFullDemandesData = async () => {
    try {
      const { data } = await workflowService.getDemandes({ limit: 10000, pagination: false });
      return data.results || data || [];
    } catch {
      return demandes;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[var(--text-primary)] font-bold text-xl">Workflow des Demandes</h2>
        <p className="text-[var(--text-secondary)] text-sm">Gestion du cycle de vie des demandes de matériel</p>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{typeof apiError === 'string' ? apiError : "Impossible de joindre l'API."}</span>
        </div>
      )}

      {/* Formulaire Agence uniquement */}
      {hasRole('ROLE_AGENCE') && (
        <NewRequestForm onSubmit={handleSubmitRequest} loading={submitLoading} />
      )}

      {/* Stats par statut */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUT_CONFIG).map(([statut, { color, icon: Icon }]) => {
          const count = countByStatut(statut);
          return (
            <button key={statut}
              onClick={() => setFilterStatut(filterStatut === statut ? '' : statut)}
              className={`bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 text-left hover:bg-white/8 transition-all
                ${filterStatut === statut ? 'ring-1 ring-blue-500/50' : ''}`}>
              <Icon className={`w-5 h-5 mb-2 ${color.split(' ')[1]}`} />
              <p className="text-[var(--text-primary)] font-bold text-2xl tabular-nums">{count}</p>
              <p className="text-[var(--text-secondary)] text-xs mt-0.5">{statut}</p>
            </button>
          );
        })}
      </div>

      {/* Liste des demandes */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <h3 className="text-[var(--text-primary)] font-semibold text-sm">
            {canAccess('validate_demandes') ? 'Demandes Entrantes' : 'Mes Demandes'}
          </h3>
          <div className="flex items-center gap-3">
            <div className="h-[42px]">
              <ExportButton 
                data={demandes}
                filteredData={filtered}
                fetchFullData={fetchFullDemandesData}
                columns={[
                  { header: 'ID Demande', accessor: 'idDemande' },
                  { header: 'Motif', accessor: 'motif' },
                  { header: 'Description', accessor: 'description' },
                  { header: 'Statut', accessor: (row) => normalizeStatut(row.statut) },
                  { header: 'Agence', accessor: 'agence' },
                  { header: 'Utilisateur', accessor: 'utilisateur' },
                  { header: 'Date', accessor: (row) => row.dateDemande ? new Date(row.dateDemande).toLocaleDateString('fr-FR') : '' }
                ]}
                fileName="workflow"
                reportTitle="Rapport des Demandes (Workflow)"
              />
            </div>
            <div className="relative h-[42px]">
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2.5 h-full text-sm text-[var(--text-primary)] outline-none">
                <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Tous les statuts</option>
                {Object.keys(STATUT_CONFIG).map(s => <option key={s} value={s} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{s}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            {apiError ? 'Erreur API — vérifiez le backend.' : 'Aucune demande.'}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((d) => {
              const statutDisplay = normalizeStatut(d.statut);
              const { color, icon: StatusIcon } = STATUT_CONFIG[statutDisplay] || STATUT_CONFIG['En attente'];
              return (
                <div key={d.id || d.idDemande} className="p-4 hover:bg-[var(--bg-card)] transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FileText className="w-5 h-5 text-[var(--text-secondary)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[var(--text-primary)] font-semibold text-sm">
                            #{d.idDemande} — {d.motif || 'Demande de matériel'}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs truncate">{d.description || d.motif}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text-muted)]">
                          <span>{d.agence || '—'}</span>
                          <span>·</span>
                          <span>{d.utilisateur || '—'}</span>
                          <span>·</span>
                          <span>
                            {d.dateDemande
                              ? new Date(d.dateDemande).toLocaleDateString('fr-FR')
                              : '—'}
                          </span>
                        </div>
                        {hasRole('ROLE_TECHNICIEN') && d.statut === 'AFFECTE' && d.idTechnicien === user?.idUtilisateur && d.commentaireValidation && (
                          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex gap-2.5 max-w-lg">
                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide mb-0.5">Ordre du Manager</p>
                              <p className="text-xs text-amber-400 font-medium leading-relaxed">{d.commentaireValidation}</p>
                            </div>
                          </div>
                        )}
                        {d.statut === 'RESOLU' && d.noteResolution && (
                          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl flex gap-2.5 max-w-lg">
                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-0.5">Rapport Technicien</p>
                              <p className="text-xs text-emerald-400 font-medium leading-relaxed">{d.noteResolution}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statutDisplay}
                      </span>
                      {canAccess('validate_demandes') && (d.statut === 'EN_ATTENTE') && (
                        <div className="flex gap-1.5">
                          <button onClick={() => setSignatureTarget(d.idDemande)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-all border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5" /> Approuver
                          </button>
                          {!d.motif?.includes('Urgence: Critique') ? (
                            <button onClick={() => setRejectModal(d.idDemande)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-all border border-red-500/30">
                              <X className="w-3.5 h-3.5" /> Rejeter
                            </button>
                          ) : (
                            <div className="flex items-center gap-1 px-2 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-bold uppercase">
                              <AlertCircle className="w-3.5 h-3.5" /> Approbation Obligatoire
                            </div>
                          )}
                        </div>
                      )}
                      
                      {hasRole('ROLE_TECHNICIEN') && (d.statut === 'AFFECTE') && d.idTechnicien === user?.idUtilisateur && (
                        <button onClick={() => setResolvedTarget(d)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-medium transition-all border border-primary/30 ml-2">
                          <Check className="w-3.5 h-3.5" /> Traiter
                        </button>
                      )}

                      {d.statut === 'RESOLU' && (
                        <button onClick={() => handleDownloadPV(d.idDemande || d.id)}
                          className="flex items-center gap-1 px-3 py-1.5 ml-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-500 rounded-lg text-xs font-medium transition-all border border-slate-500/20">
                          <FileText className="w-3.5 h-3.5" /> PV de Livraison
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {signatureTarget && (
        <AffectationModal onConfirm={handleApprove} onClose={() => setSignatureTarget(null)} loading={sigLoading} currentUser={user} />
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold">Motif du Rejet</h3>
                <p className="text-[var(--text-secondary)] text-xs">Demande #{rejectModal}</p>
              </div>
            </div>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Expliquez le motif du rejet..." rows={3}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-red-500/50 resize-none transition-all placeholder-slate-500 mb-4" />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] transition-all">Annuler</button>
              <button onClick={handleReject}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-[var(--text-primary)] text-sm font-medium transition-all">Confirmer le Rejet</button>
            </div>
          </div>
        </div>
      )}

      {resolvedTarget && (
        <ResoudreModal target={resolvedTarget} onConfirm={handleResolve} onClose={() => setResolvedTarget(null)} loading={resolveLoading} />
      )}
    </div>
  );
}
