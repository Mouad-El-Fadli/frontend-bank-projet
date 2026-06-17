import { useState, useEffect, useCallback, useRef } from 'react';
import { equipmentService, agenceService } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Search, Filter, QrCode, Pencil, AlertTriangle,
  X, Check, Loader2, ChevronDown, Package, Calendar, Hash, WifiOff
} from 'lucide-react';
import { alerts } from '../utils/alerts';
import ExportButton from '../components/ExportButton';

// Backend statuts: DISPONIBLE, AFFECTE, EN_PANNE, EN_MAINTENANCE, RETIRE
const STATUTS = ['DISPONIBLE', 'AFFECTE', 'EN_MAINTENANCE', 'EN_PANNE', 'RETIRE'];

const STATUT_LABELS = {
  DISPONIBLE: 'Disponible',
  AFFECTE: 'Affecté',
  EN_MAINTENANCE: 'En Maintenance',
  EN_PANNE: 'En Panne',
  RETIRE: 'Retiré',
};

const STATUT_COLORS = {
  DISPONIBLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  AFFECTE: 'bg-primary/10 text-primary border-primary/20',
  EN_MAINTENANCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  EN_PANNE: 'bg-red-500/10 text-red-400 border-red-500/20',
  RETIRE: 'bg-slate-500/15 text-[var(--text-secondary)] border-slate-500/20',
};

const Field = ({ label, name, type = 'text', options, form, setForm, errors }) => (
  <div>
    <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">{label}</label>
    {options ? (
      <select
        value={form[name] || ''}
        onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
      >
        {options.map(o => <option key={o.value || o} value={o.value || o} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{o.label || o}</option>)}
      </select>
    ) : (
      <input
        type={type}
        value={form[name] || ''}
        onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
        className={`w-full bg-[var(--bg-card)] border rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all
          ${errors[name] ? 'border-red-500/50' : 'border-[var(--border-color)]'}`}
      />
    )}
    {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name]}</p>}
  </div>
);

const EquipmentModal = ({ equipment, onClose, onSave }) => {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const [types, setTypes] = useState([]);
  const [succursales, setSuccursales] = useState([]);
  const [agences, setAgences] = useState([]);
  const [form, setForm] = useState(equipment || {
    numeroSerie: '',
    modele: '',
    marque: '',
    idType: '',
    statut: 'DISPONIBLE',
    dateAchat: '',
    finGarantie: '',
    finAmortissement: '',
    prixAchat: '',
    notes: '',
    idAgence: '',
    idSuccursale: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [tRes, sRes, aRes] = await Promise.all([
          equipmentService.getTypes(),
          agenceService.getSuccursales(),
          agenceService.getAll()
        ]);
        if (!mounted) return;
        setTypes(Array.isArray(tRes.data) ? tRes.data : []);
        setSuccursales(Array.isArray(sRes.data) ? sRes.data : []);
        setAgences(Array.isArray(aRes.data?.results || aRes.data) ? (aRes.data?.results || aRes.data) : []);

        // Pre-fill idSuccursale for Manager/Tech on new item
        if (!equipment && !isAdmin && user?.idSuccursale) {
          setForm(f => ({ ...f, idSuccursale: user.idSuccursale }));
        }
      } catch {
        if (!mounted) return;
        setTypes([]);
        setSuccursales([]);
        setAgences([]);
      }
    })();
    return () => { mounted = false; };
  }, [equipment, isAdmin, user]);

  const validate = () => {
    const e = {};
    if (!form.numeroSerie) e.numeroSerie = 'Numéro de série requis';
    if (!form.modele) e.modele = 'Modèle requis';
    if (!form.marque) e.marque = 'Marque requise';
    if (!form.idType) e.idType = 'Type requis';
    
    if (form.statut === 'DISPONIBLE') {
      if (isAdmin && !form.idSuccursale) e.idSuccursale = 'Direction Régionale requise';
    } else {
      if (!user?.idAgence && !form.idAgence) e.idAgence = 'Agence requise';
    }
    
    setErrors(e);
    if (Object.keys(e).length > 0) {
      alerts.error('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        marque: form.marque,
        modele: form.modele,
        numeroSerie: form.numeroSerie,
        statut: form.statut,
        idType: Number(form.idType),
        idSuccursale: Number(form.idSuccursale) || null,
        ...(form.idAgence ? { idAgence: Number(form.idAgence) } : {}),
        ...(form.dateAchat ? { dateAchat: form.dateAchat } : {}),
        ...(form.prixAchat !== '' ? { prixAchat: form.prixAchat } : {}),
        ...(form.finGarantie ? { finGarantie: form.finGarantie } : {}),
        ...(form.finAmortissement ? { finAmortissement: form.finAmortissement } : {}),
        ...(form.notes ? { notes: form.notes } : {}),
      };

      if (equipment?.idEquipement) {
        await equipmentService.update(equipment.idEquipement, payload);
        alerts.success('Succès', 'Équipement modifié avec succès');
      } else {
        await equipmentService.create(payload);
        alerts.success('Succès', 'Équipement créé avec succès');
      }
      onSave();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Erreur lors de la sauvegarde. Vérifiez les données.';
      setErrors({ api: msg });
      alerts.error('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };


  const statutOptions = STATUTS.map(s => ({ value: s, label: STATUT_LABELS[s] || s }));
  const typeOptions = [
    { value: '', label: 'Sélectionnez un type...' },
    ...(types || []).map(t => ({ value: t.idType, label: t.libelle || t.nom || `Type ${t.idType}` }))
  ];
  const succursaleOptions = (succursales || []).map(s => ({ value: s.idSuccursale, label: s.nom || `Direction ${s.idSuccursale}` }));

  const currentSuccursaleName = succursales.find(s => String(s.idSuccursale) === String(form.idSuccursale))?.nom || 'Votre Direction';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div>
            <h2 className="text-[var(--text-primary)] font-semibold text-lg">
              {equipment ? 'Modifier l\'équipement' : 'Nouvel équipement'}
            </h2>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5">
              {equipment ? `Ref: ${equipment.numeroSerie}` : 'Remplissez tous les champs requis'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {errors.api && (
            <div className="col-span-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">{errors.api}</div>
          )}
          <div className="col-span-2 border-b border-[var(--border-color)] pb-2 mb-1">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
              <Hash className="w-3 h-3" /> Identification
            </p>
          </div>
          <Field label="Numéro de Série *" name="numeroSerie" form={form} setForm={setForm} errors={errors} />
          <Field label="Modèle *" name="modele" form={form} setForm={setForm} errors={errors} />
          <Field label="Marque *" name="marque" form={form} setForm={setForm} errors={errors} />
          <Field label="Type *" name="idType" options={typeOptions} form={form} setForm={setForm} errors={errors} />
          <Field label="Statut" name="statut" options={statutOptions} form={form} setForm={setForm} errors={errors} />
          {form.statut === 'DISPONIBLE' ? (
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Direction Régionale *</label>
              {isAdmin ? (
                <select
                  value={form.idSuccursale || ''}
                  onChange={(e) => setForm(f => ({ ...f, idSuccursale: e.target.value }))}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
                >
                  <option value="">Sélectionnez une direction...</option>
                  {succursaleOptions.map(o => (
                    <option key={o.value} value={o.value} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{o.label}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5 text-orange-600 text-sm flex items-center gap-2 font-semibold">
                  <Package className="w-4 h-4" /> {currentSuccursaleName}
                </div>
              )}
              {errors.idSuccursale && <p className="text-red-400 text-xs mt-1">{errors.idSuccursale}</p>}
            </div>
          ) : (
            <div>
              <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Agence *</label>
              {!user?.idAgence ? (
                <select
                  value={form.idAgence || ''}
                  onChange={(e) => setForm(f => ({ ...f, idAgence: e.target.value }))}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-blue-500/50 transition-all font-medium"
                >
                  <option value="">Sélectionnez une agence...</option>
                  {agences.map(a => (
                    <option key={a.idAgence} value={a.idAgence} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      {a.nom}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2.5 text-blue-600 text-sm flex items-center gap-2 font-semibold">
                  <Package className="w-4 h-4" /> {user?.agence || 'Votre Agence'}
                </div>
              )}
              {errors.idAgence && <p className="text-red-400 text-xs mt-1">{errors.idAgence}</p>}
            </div>
          )}

          <div className="col-span-2 border-b border-[var(--border-color)] pb-2 mb-1 mt-2">
            <p className="text-[var(--text-muted)] text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Dates & Finance
            </p>
          </div>
          <Field label="Date d'Achat" name="dateAchat" type="date" form={form} setForm={setForm} errors={errors} />
          <Field label="Fin de Garantie" name="finGarantie" type="date" form={form} setForm={setForm} errors={errors} />
          <Field label="Fin d'Amortissement" name="finAmortissement" type="date" form={form} setForm={setForm} errors={errors} />
          <Field label="Prix d'Achat" name="prixAchat" type="number" form={form} setForm={setForm} errors={errors} />

          <div className="col-span-2">
            <label className="text-xs text-[var(--text-secondary)] mb-1 block font-medium">Description / Notes</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-[var(--text-primary)] text-sm outline-none focus:border-blue-500/50 resize-none transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-[var(--border-color)]">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] text-sm transition-all">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-accent text-[var(--text-primary)] text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {equipment ? 'Enregistrer' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ParcMateriel() {
  const { hasRole, canAccess } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(''); // idType
  const [filterStatut, setFilterStatut] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [qrLoading, setQrLoading] = useState(null);
  const [qrModal, setQrModal] = useState(null);


  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await equipmentService.getTypes();
        if (!mounted) return;
        setTypes(Array.isArray(data) ? data : []);
      } catch {
        if (!mounted) return;
        setTypes([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const params = {
        ...(search ? { search } : {}),
        ...(filterType ? { idType: filterType } : {}),
        ...(filterStatut ? { statut: filterStatut } : {}),
      };
      const { data } = await equipmentService.getAll(params);
      setEquipment(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Erreur de connexion à l'API";
      setApiError(errorMsg);
      setEquipment([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterType, filterStatut]);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const filtered = equipment.filter(e => {
    const s = (e.statut || '').toUpperCase().replace(/ /g, '_');
    const matchSearch = !search ||
      e.numeroSerie?.toLowerCase().includes(search.toLowerCase()) ||
      e.modele?.toLowerCase().includes(search.toLowerCase()) ||
      e.marque?.toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || String(e.idType) === String(filterType);
    const matchStatut = !filterStatut || s === filterStatut || e.statut === filterStatut;
    return matchSearch && matchType && matchStatut;
  });

  const handleQR = async (eq) => {
    setQrLoading(eq.idEquipement || eq.id);
    try {
      // Remplace localhost par l'IP réseau pour permettre le scan via mobile
      let clientUrl = window.location.origin;
      if (window.location.hostname === 'localhost') {
        clientUrl = clientUrl.replace('localhost', '192.168.33.101');
      }
      const blob = await equipmentService.generateQR(eq.idEquipement || eq.id, clientUrl);
      const url = URL.createObjectURL(blob.data);
      // Ouvre la popup interactive
      setQrModal({ equipment: eq, url });
    } catch {
      alerts.error('Erreur', 'QR Code non disponible.');
    } finally {
      setQrLoading(null);
    }
  };
  
  const handleDownloadQR = () => {
    if (!qrModal) return;
    const a = document.createElement('a');
    a.href = qrModal.url;
    a.download = `qr-${qrModal.equipment.numeroSerie}.png`;
    a.click();
  };

  const handleHS = async (id) => {
    const result = await alerts.confirm('Mise HS', 'Voulez-vous vraiment mettre cet équipement hors service ?', 'Confirmer', 'Annuler');
    if (result.isConfirmed) {
      try {
        await equipmentService.setHS(id);
        setEquipment(eq => eq.map(e => ((e.idEquipement || e.id) === id) ? { ...e, statut: 'EN_PANNE' } : e));
        alerts.success('Opération réussie');
      } catch {
        alerts.error('Erreur', 'Impossible de mettre à jour le statut.');
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[var(--text-primary)] font-bold text-xl">Parc Matériel</h2>
          <p className="text-[var(--text-secondary)] text-sm">{filtered.length} équipement(s) trouvé(s)</p>
        </div>
        <div className="flex gap-3">
          <ExportButton 
            data={equipment}
            filteredData={filtered}
            columns={[
              { header: 'N° Série', accessor: 'numeroSerie' },
              { header: 'Modèle', accessor: 'modele' },
              { header: 'Marque', accessor: 'marque' },
              { header: 'Type', accessor: 'typeMateriel' },
              { header: 'Statut', accessor: (row) => STATUT_LABELS[row.statut] || row.statut },
              { header: 'Date Achat', accessor: 'dateAchat' },
              { header: 'Garantie', accessor: 'finGarantie' },
              { header: 'Agence', accessor: (row) => row.agence ? row.agence : (row.succursale && row.statut === 'DISPONIBLE' ? `Stock: ${row.succursale}` : '') }
            ]}
            fileName="parc-materiel"
            reportTitle="Rapport du Parc Matériel"
          />

          {canAccess('equipment_write') && (
            <button
              onClick={() => { setEditItem(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-accent text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> Nouvel Équipement
            </button>
          )}
        </div>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold">{typeof apiError === 'string' ? apiError : "Impossible de joindre l'API."}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-[var(--text-secondary)]" />
          <input
            className="bg-transparent text-sm text-[var(--text-primary)] placeholder-slate-500 outline-none w-full"
            placeholder="N° de série, modèle, marque..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Tous les types</option>
            {types.map(t => (
              <option key={t.idType} value={t.idType} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                {t.libelle || t.nom || `Type ${t.idType}`}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterStatut}
            onChange={e => setFilterStatut(e.target.value)}
            className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2 text-sm text-[var(--text-primary)] outline-none cursor-pointer"
          >
            <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{STATUT_LABELS[s]}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]">
                  {['N° Série', 'Modèle / Marque', 'Type', 'Statut', 'Date Achat', 'Garantie', 'Agence', 'Actions'].map(h => (
                    <th key={h} className="text-left text-[var(--text-secondary)] text-xs font-medium px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-[var(--text-muted)] py-12">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      {apiError ? 'Erreur API — vérifiez que le backend est actif.' : 'Aucun équipement trouvé.'}
                    </td>
                  </tr>
                ) : filtered.map((eq) => (
                  <tr key={eq.idEquipement || eq.id} className="hover:bg-[var(--bg-card)] transition-colors group">
                    <td className="px-4 py-3 font-mono text-blue-400 text-xs">{eq.numeroSerie}</td>
                    <td className="px-4 py-3">
                      <p className="text-[var(--text-primary)] font-medium">{eq.modele}</p>
                      <p className="text-[var(--text-muted)] text-xs">{eq.marque}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{eq.typeMateriel || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${STATUT_COLORS[eq.statut] || 'bg-slate-500/20 text-[var(--text-secondary)] border-slate-500/20'}`}>
                        {STATUT_LABELS[eq.statut] || eq.statut_display || eq.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{eq.dateAchat || '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{eq.finGarantie || '—'}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs max-w-32 truncate">
                      {eq.agence ? eq.agence : (eq.succursale && eq.statut === 'DISPONIBLE' ? <span className="text-primary italic">Stock: {eq.succursale}</span> : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canAccess('equipment_write') && (
                          <button
                            onClick={() => handleQR(eq)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all"
                            title="Générer QR Code"
                          >
                            {qrLoading === (eq.idEquipement || eq.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                          </button>
                        )}
                        {canAccess('equipment_write') && (
                          <button
                            onClick={() => { setEditItem(eq); setModalOpen(true); }}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-primary hover:bg-primary/10 transition-all"
                            title="Modifier"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {(canAccess('equipment_write') || hasRole('AGENCE')) && eq.statut !== 'EN_PANNE' && eq.statut !== 'RETIRE' && (
                          <button
                            onClick={() => handleHS(eq.idEquipement || eq.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 hover:border-red-500 transition-all"
                            title="Signaler une Panne"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Panne
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <EquipmentModal
          equipment={editItem}
          onClose={() => setModalOpen(false)}
          onSave={fetchEquipment}
        />
      )}

      {qrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <button onClick={() => setQrModal(null)} className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-white bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6">
              <QrCode className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">Code QR Généré</h3>
            <p className="text-[var(--text-secondary)] text-sm mb-6">
              Scannez maintenant depuis l'écran, ou téléchargez-le pour l'imprimer.
            </p>
            
            <div className="bg-white rounded-2xl p-4 flex justify-center mb-6 shadow-inner mx-auto w-fit">
               <img src={qrModal.url} alt="QR Code" className="w-48 h-48 object-contain" />
            </div>
            
            <p className="font-mono text-sm text-blue-400 mb-6 font-semibold">
              <Hash className="w-4 h-4 inline-block mr-1 -mt-0.5" />
              {qrModal.equipment.numeroSerie}
            </p>

            <button
              onClick={handleDownloadQR}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
            >
              Télécharger le QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
