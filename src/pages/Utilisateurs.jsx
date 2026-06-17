import { useEffect, useMemo, useState } from 'react';
import { agenceService, utilisateurService } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { alerts } from '../utils/alerts';
import { Loader2, Plus, Search, Shield, Trash2, Pencil, X, MapPin } from 'lucide-react';
import ExportButton from '../components/ExportButton';

const ROLE_OPTIONS = [
  { idRole: 1, label: 'Administrateur', value: 'ROLE_ADMIN' },
  { idRole: 2, label: 'Manager IT', value: 'ROLE_MANAGER' },
  { idRole: 3, label: 'Technicien', value: 'ROLE_TECHNICIEN' },
  { idRole: 4, label: 'Chef d’Agence', value: 'ROLE_AGENCE' },
];

const initialForm = {
  idUtilisateur: null,
  prenom: '',
  nom: '',
  email: '',
  idRole: '',
  idAgence: '',
  idSuccursale: '',
  motDePasse: '',
  estActif: true,
};

function normalizeUser(u) {
  return {
    idUtilisateur: u.idUtilisateur ?? u.id ?? u.user_id ?? null,
    prenom: u.prenom ?? '',
    nom: u.nom ?? '',
    email: u.email ?? '',
    role: u.role ?? u.nomRole ?? '',
    idRole: u.idRole ?? u.role_id ?? '',
    idAgence: u.idAgence ?? null,
    idSuccursale: u.idSuccursale ?? null,
    agence: u.agence ?? null,
    succursale: u.succursale ?? null,
    estActif: u.estActif ?? u.is_active ?? u.actif ?? true,
  };
}

function rattachementLabel(u) {
  const r = u.role || '';
  if (r === 'ROLE_AGENCE') return u.agence ? u.agence : '—';
  if (r === 'ROLE_MANAGER' || r === 'ROLE_TECHNICIEN') return u.succursale ? u.succursale : '—';
  return '—';
}

export default function Utilisateurs() {
  const { canAccess } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [users, setUsers] = useState([]);
  const [agences, setAgences] = useState([]);
  const [succursales, setSuccursales] = useState([]);
  const [refsError, setRefsError] = useState(false);
  const [query, setQuery] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const selectedRoleMeta = ROLE_OPTIONS.find((r) => String(r.idRole) === String(form.idRole));

  const agencesParDirection = useMemo(() => {
    const map = new Map();
    for (const a of agences) {
      const dir = a.succursale || 'Autre';
      if (!map.has(dir)) map.set(dir, []);
      map.get(dir).push(a);
    }
    for (const list of map.values()) {
      list.sort((x, y) => (x.nom || '').localeCompare(y.nom || '', 'fr'));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [agences]);

  useEffect(() => {
    if (!canAccess('gestion_comptes')) return;

    let mounted = true;
    (async () => {
      try {
        const { data } = await utilisateurService.getAll();
        if (!mounted) return;
        setUsers(Array.isArray(data) ? data.map(normalizeUser) : []);
        setApiError(false);
      } catch (err) {
        if (!mounted) return;
        const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Erreur de connexion à l'API";
        setApiError(errorMsg);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }

      try {
        const [agRes, sucRes] = await Promise.all([
          agenceService.getAll(),
          agenceService.getSuccursales(),
        ]);
        if (!mounted) return;
        setAgences(Array.isArray(agRes.data) ? agRes.data : []);
        setSuccursales(Array.isArray(sucRes.data) ? sucRes.data : []);
        setRefsError(false);
      } catch {
        if (!mounted) return;
        setRefsError(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [canAccess]);

  const fetchFullUsersData = async () => {
    try {
      const { data } = await utilisateurService.getAll({ limit: 10000, pagination: false });
      return Array.isArray(data) ? data.map(normalizeUser) : [];
    } catch {
      return users;
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const s = `${u.prenom} ${u.nom} ${u.email} ${u.role} ${rattachementLabel(u)}`.toLowerCase();
      return s.includes(q);
    });
  }, [users, query]);

  const openCreate = () => {
    setForm(initialForm);
    setOpen(true);
  };

  const openEdit = (u) => {
    setForm({
      idUtilisateur: u.idUtilisateur,
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      idRole: u.idRole || '',
      idAgence: u.idAgence != null ? String(u.idAgence) : '',
      idSuccursale: u.idSuccursale != null ? String(u.idSuccursale) : '',
      motDePasse: '',
      estActif: !!u.estActif,
    });
    setOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const roleMeta = ROLE_OPTIONS.find((r) => String(r.idRole) === String(form.idRole));

      const payload = {
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        email: form.email.trim(),
        idRole: Number(form.idRole),
        estActif: !!form.estActif,
        ...(form.motDePasse ? { motDePasse: form.motDePasse } : {}),
      };

      if (!payload.prenom || !payload.nom || !payload.email || !payload.idRole) {
        alerts.error('Champs manquants', 'Veuillez compléter prénom, nom, email et rôle.');
        return;
      }

      if (roleMeta?.value === 'ROLE_AGENCE') {
        if (!form.idAgence) {
          alerts.error('Affectation requise', 'Choisissez l’agence dont cette personne est le chef.');
          return;
        }
        payload.idAgence = Number(form.idAgence);
        payload.idSuccursale = null;
      } else if (roleMeta?.value === 'ROLE_MANAGER' || roleMeta?.value === 'ROLE_TECHNICIEN') {
        if (!form.idSuccursale) {
          alerts.error('Affectation requise', 'Choisissez la direction régionale (succursale) de ce compte.');
          return;
        }
        payload.idSuccursale = Number(form.idSuccursale);
        payload.idAgence = null;
      } else {
        payload.idAgence = null;
        payload.idSuccursale = null;
      }

      if (form.idUtilisateur) {
        await utilisateurService.update(form.idUtilisateur, payload);
        alerts.toast('Utilisateur mis à jour');
      } else {
        if (!payload.motDePasse) {
          alerts.error('Mot de passe requis', 'Veuillez définir un mot de passe pour le nouvel utilisateur.');
          return;
        }
        const { data } = await utilisateurService.create(payload);
        const created = normalizeUser(data);
        setUsers((prev) => [created, ...prev]);
        alerts.toast('Utilisateur créé');
        closeModal();
        return;
      }

      const { data } = await utilisateurService.getAll();
      setUsers(Array.isArray(data) ? data.map(normalizeUser) : []);
      closeModal();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Erreur lors de la sauvegarde. Vérifiez les données.';
      alerts.error('Erreur', msg);
    } finally {
      setSaving(false);
    }
  };

  const disableUser = async (u) => {
    const id = u.idUtilisateur;
    if (!id) return;
    try {
      await utilisateurService.delete(id);
      setUsers((prev) => prev.map((x) => (x.idUtilisateur === id ? { ...x, estActif: false } : x)));
      alerts.toast('Utilisateur désactivé');
    } catch {
      alerts.error('Erreur', 'Impossible de désactiver cet utilisateur.');
    }
  };

  if (!canAccess('gestion_comptes')) {
    return (
      <div className="max-w-3xl">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5 text-[var(--text-secondary)]" />
            <h2 className="text-[var(--text-primary)] font-semibold">Gestion des comptes</h2>
          </div>
          <p className="text-[var(--text-secondary)] text-sm">
            Accès réservé aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[var(--text-primary)] font-bold text-2xl">Gestion des comptes</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Création, mise à jour et désactivation des utilisateurs.</p>
        </div>
        <div className="flex gap-3">
          <div className="h-[42px]">
            <ExportButton 
              data={users}
              filteredData={filtered}
              fetchFullData={fetchFullUsersData}
              columns={[
                { header: 'Prénom', accessor: 'prenom' },
                { header: 'Nom', accessor: 'nom' },
                { header: 'Email', accessor: 'email' },
                { header: 'Rôle', accessor: 'role' },
                { header: 'Rattachement', accessor: (row) => rattachementLabel(row) },
                { header: 'Statut', accessor: (row) => row.estActif ? 'Actif' : 'Inactif' }
              ]}
              fileName="utilisateurs"
              reportTitle="Liste des Utilisateurs"
            />
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-accent text-[var(--text-primary)] text-sm font-semibold transition-all shadow-lg shadow-primary/20 h-[42px]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouvel utilisateur</span>
          </button>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          <span className="font-semibold">{typeof apiError === 'string' ? apiError : "Impossible de joindre l’API (utilisateurs / agences / directions)."}</span>
        </div>
      )}

      {!apiError && refsError && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-200 text-sm">
          Liste des utilisateurs chargée, mais les agences ou directions n’ont pas pu être chargées : la sélection d’affectation dans le formulaire peut être vide.
        </div>
      )}

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (nom, email, rôle)..."
              className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] pl-10 pr-3 py-2.5 rounded-xl text-[var(--text-primary)] placeholder-slate-500 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </div>
          <div className="text-[var(--text-secondary)] text-xs whitespace-nowrap">
            {filtered.length} utilisateur(s)
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--bg-card)]">
              <tr className="text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Utilisateur</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Rôle</th>
                <th className="text-left px-4 py-3">Rattachement</th>
                <th className="text-left px-4 py-3">Statut</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.idUtilisateur ?? u.email} className="border-t border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[var(--text-primary)] font-medium">{u.prenom} {u.nom}</div>
                    <div className="text-[var(--text-muted)] text-xs">ID: {u.idUtilisateur ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{u.role || '—'}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                      <span className="truncate max-w-[200px]" title={rattachementLabel(u)}>
                        {rattachementLabel(u)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.estActif ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-500/15 text-[var(--text-secondary)]'}`}>
                      {u.estActif ? 'Actif' : 'Désactivé'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => disableUser(u)}
                        disabled={!u.estActif}
                        className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        title="Désactiver"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-10 text-center text-[var(--text-muted)]" colSpan={6}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative w-full max-w-xl bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl transition-[box-shadow,min-height] duration-300 ease-out">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)]">
              <div>
                <p className="text-[var(--text-primary)] font-semibold">
                  {form.idUtilisateur ? 'Modifier un utilisateur' : 'Créer un utilisateur'}
                </p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">Admin uniquement</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Prénom</label>
                  <input
                    value={form.prenom}
                    onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2.5 rounded-xl text-[var(--text-primary)] outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Nom</label>
                  <input
                    value={form.nom}
                    onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2.5 rounded-xl text-[var(--text-primary)] outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2.5 rounded-xl text-[var(--text-primary)] outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Rôle</label>
                  <select
                    value={form.idRole}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        idRole: e.target.value,
                        idAgence: '',
                        idSuccursale: '',
                      }))
                    }
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2.5 rounded-xl text-[var(--text-primary)] outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    required
                  >
                    <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Choisir…</option>
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.idRole} value={r.idRole} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">
                    {form.idUtilisateur ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe'}
                  </label>
                  <input
                    type="password"
                    value={form.motDePasse}
                    onChange={(e) => setForm((p) => ({ ...p, motDePasse: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2.5 rounded-xl text-[var(--text-primary)] outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder={form.idUtilisateur ? 'Laisser vide pour ne pas changer' : '••••••••'}
                  />
                </div>
              </div>

              {selectedRoleMeta?.value === 'ROLE_AGENCE' && (
                <div
                  key="affectation-agence"
                  className="animate-form-section space-y-2 pt-3 mt-1 border-t border-[var(--border-color)]"
                >
                  <label
                    htmlFor="util-affectation-agence"
                    className="block text-[11px] font-bold text-[var(--text-secondary)] tracking-[0.12em]"
                  >
                    AFFECTATION (AGENCE)
                  </label>
                  <select
                    id="util-affectation-agence"
                    value={form.idAgence}
                    onChange={(e) => setForm((p) => ({ ...p, idAgence: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2.5 rounded-xl text-[var(--text-primary)] outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    required
                  >
                    <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Choisir une agence…</option>
                    {agencesParDirection.map(([dir, list]) => (
                      <optgroup key={dir} label={dir} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        {list.map((a) => (
                          <option key={a.idAgence} value={a.idAgence} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                            {a.nom}
                            {a.ville ? ` — ${a.ville}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              {(selectedRoleMeta?.value === 'ROLE_MANAGER' ||
                selectedRoleMeta?.value === 'ROLE_TECHNICIEN') && (
                <div
                  key="affectation-direction"
                  className="animate-form-section space-y-2 pt-3 mt-1 border-t border-[var(--border-color)]"
                >
                  <label
                    htmlFor="util-affectation-direction"
                    className="block text-[11px] font-bold text-[var(--text-secondary)] tracking-[0.12em]"
                  >
                    AFFECTATION (DIRECTION)
                  </label>
                  <select
                    id="util-affectation-direction"
                    value={form.idSuccursale}
                    onChange={(e) => setForm((p) => ({ ...p, idSuccursale: e.target.value }))}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-2.5 rounded-xl text-[var(--text-primary)] outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
                    required
                  >
                    <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Choisir une direction…</option>
                    {succursales.map((s) => (
                      <option key={s.idSuccursale} value={s.idSuccursale} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={!!form.estActif}
                    onChange={(e) => setForm((p) => ({ ...p, estActif: e.target.checked }))}
                    className="accent-primary"
                  />
                  Compte actif
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-accent text-[var(--text-primary)] text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

