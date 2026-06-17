import { useCallback, useEffect, useMemo, useState } from 'react';
import { agenceService, utilisateurService } from '../api/api';
import { alerts } from '../utils/alerts';
import {
  Building2, MapPin, Users, ChevronDown, Plus, Loader2, Sparkles, ShieldCheck, Link2,
} from 'lucide-react';
import ExportButton from '../components/ExportButton';

const roleLabel = (role) => {
  if (role === 'ROLE_MANAGER') return 'Manager Régional';
  if (role === 'ROLE_TECHNICIEN') return 'Technicien Régional';
  if (role === 'ROLE_AGENCE') return 'Chef d’Agence';
  if (role === 'ROLE_ADMIN') return 'Administrateur';
  return role || '—';
};

const pillClass = (tone) => {
  if (tone === 'manager') return 'bg-primary/15 text-primary border-primary/25';
  if (tone === 'tech') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
  if (tone === 'agence') return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
  return 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)]';
};

export default function DirectionsRegionales() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(false);

  const [succursales, setSuccursales] = useState([]);
  const [agences, setAgences] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedSuccursaleId, setSelectedSuccursaleId] = useState(null);
  const [addAgenceId, setAddAgenceId] = useState('');
  const [assignManagerId, setAssignManagerId] = useState('');
  const [assignTechId, setAssignTechId] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    try {
      const [sRes, aRes, uRes] = await Promise.all([
        agenceService.getSuccursales(),
        agenceService.getAll(),
        utilisateurService.getAll(),
      ]);
      setSuccursales(sRes.data || []);
      setAgences(aRes.data || []);
      setUsers(uRes.data || []);
    } catch (err) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Erreur de connexion à l'API";
      setApiError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedSuccursale = useMemo(() => {
    const id = selectedSuccursaleId ?? succursales?.[0]?.idSuccursale ?? null;
    if (id && selectedSuccursaleId == null) setSelectedSuccursaleId(id);
    return succursales.find((s) => String(s.idSuccursale) === String(id)) || null;
  }, [succursales, selectedSuccursaleId]);

  const agencesBySucc = useMemo(() => {
    const map = new Map();
    agences.forEach((a) => {
      const key = String(a.idSuccursale ?? '');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    for (const [k, list] of map.entries()) {
      list.sort((x, y) => (x.nom || '').localeCompare(y.nom || ''));
      map.set(k, list);
    }
    return map;
  }, [agences]);

  const usersBySucc = useMemo(() => {
    const map = new Map();
    users.forEach((u) => {
      const key = String(u.idSuccursale ?? '');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(u);
    });
    return map;
  }, [users]);

  const unassignedAgences = useMemo(() => {
    // Dans ce projet, idSuccursale est obligatoire pour Agence, donc la liste est souvent vide.
    // On garde quand même la sélection pour les cas “réaffectation rapide”.
    return agences
      .slice()
      .sort((x, y) => (x.nom || '').localeCompare(y.nom || ''));
  }, [agences]);

  const regionalManagers = useMemo(() => {
    return (users || [])
      .filter((u) => u.role === 'ROLE_MANAGER')
      // Tâche 2 : Ne pas inclure les managers qui sont déjà dans la direction actuellement ouverte
      .filter((u) => String(u.idSuccursale) !== String(selectedSuccursaleId))
      .sort((a, b) => (`${a.prenom} ${a.nom}`).localeCompare(`${b.prenom} ${b.nom}`));
  }, [users, selectedSuccursaleId]);

  const regionalTechs = useMemo(() => {
    return (users || [])
      .filter((u) => u.role === 'ROLE_TECHNICIEN')
      // Tâche 2 : Ne pas inclure les techniciens qui sont déjà dans la direction actuellement ouverte
      .filter((u) => String(u.idSuccursale) !== String(selectedSuccursaleId))
      .sort((a, b) => (`${a.prenom} ${a.nom}`).localeCompare(`${b.prenom} ${b.nom}`));
  }, [users, selectedSuccursaleId]);

  const chefsAgenceFor = useCallback((agenceId) => {
    return users
      .filter((u) => u.role === 'ROLE_AGENCE' && String(u.idAgence) === String(agenceId))
      .sort((a, b) => (`${a.prenom} ${a.nom}`).localeCompare(`${b.prenom} ${b.nom}`));
  }, [users]);

  const managersForSucc = useMemo(() => {
    if (!selectedSuccursale) return [];
    return (usersBySucc.get(String(selectedSuccursale.idSuccursale)) || [])
      .filter((u) => u.role === 'ROLE_MANAGER');
  }, [usersBySucc, selectedSuccursale]);

  const techsForSucc = useMemo(() => {
    if (!selectedSuccursale) return [];
    return (usersBySucc.get(String(selectedSuccursale.idSuccursale)) || [])
      .filter((u) => u.role === 'ROLE_TECHNICIEN');
  }, [usersBySucc, selectedSuccursale]);

  const agencesForSucc = useMemo(() => {
    if (!selectedSuccursale) return [];
    return agencesBySucc.get(String(selectedSuccursale.idSuccursale)) || [];
  }, [agencesBySucc, selectedSuccursale]);

  const updateUserSuccursale = async (userId, succId) => {
    const u = users.find((x) => String(x.idUtilisateur) === String(userId));
    const role = u?.role;
    if (role !== 'ROLE_MANAGER' && role !== 'ROLE_TECHNICIEN') {
      alerts.error('Affectation', 'Seuls les managers et techniciens régionaux peuvent être rattachés à une direction.');
      return;
    }
    
    // Tâche 1 & 2 : On garde le confirm frontend au cas où l'utilisateur force, 
    // mais si le confirm passe, le PUT Backend revérifiera et bloquera si besoin.
    if (u?.idSuccursale != null && String(u.idSuccursale) !== String(succId)) {
      const person = `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email || 'Cet utilisateur';
      const oldName =
        succursales.find((s) => String(s.idSuccursale) === String(u.idSuccursale))?.nom ||
        'une autre direction';
      const newName =
        succursales.find((s) => String(s.idSuccursale) === String(succId))?.nom || 'cette direction';
      const result = await alerts.confirm(
        'Réaffectation Exclusive',
        `${person} est actuellement affecté(e) à « ${oldName} ».<br><br>` +
        `<b>Règle d’exclusivité :</b> un manager ou un technicien ne peut être rattaché qu’à une seule direction.<br>` +
        `Après validation, il/elle ne sera plus lié(e) qu’à <b>${newName}</b>.`,
        'Confirmer le changement',
        'Annuler'
      );
      if (!result.isConfirmed) return;
    }

    setSaving(true);
    try {
      await utilisateurService.update(userId, { idSuccursale: succId });
      await loadAll();
      setAssignManagerId('');
      setAssignTechId('');
      alerts.toast('Affectation exclusive enregistrée (une direction par compte).');
    } catch (e) {
      // Tâche 2 : Affichage de l'erreur via un composant Toast rouge si erreur 400
      const msg = e?.response?.data?.error || 'Impossible de mettre à jour l’utilisateur.';
      if (e?.response?.status === 400) {
          alerts.toast(msg, 'error'); // Toast rouge de notre utilitaire
      } else {
          alerts.error('Erreur', msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const updateAgenceSuccursale = async (agenceId, succId) => {
    setSaving(true);
    try {
      await agenceService.update(agenceId, { idSuccursale: succId });
      await loadAll();
      alerts.toast('Agence réaffectée');
    } catch {
      alerts.error('Erreur', 'Impossible de mettre à jour l’agence.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Chargement des directions régionales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            SaaS Banking Ops
          </div>
          <h2 className="text-[var(--text-primary)] font-bold text-2xl mt-2">Directions Régionales</h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            Hiérarchie : Succursale → Agences → Personnel (Manager / Technicien / Chef d’agence).
            Chaque manager ou technicien régional est affecté à{' '}
            <span className="text-[var(--text-secondary)] font-medium">une seule direction</span> à la fois ; une nouvelle
            affectation remplace la précédente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-[42px]">
            <ExportButton 
              data={succursales.map(s => ({
                idSuccursale: s.idSuccursale,
                nom: s.nom,
                ville: s.ville,
                agences: (agencesBySucc.get(String(s.idSuccursale)) || []).length,
                personnel: (usersBySucc.get(String(s.idSuccursale)) || []).filter((u) => u.role === 'ROLE_MANAGER' || u.role === 'ROLE_TECHNICIEN').length
              }))}
              filteredData={succursales.map(s => ({
                idSuccursale: s.idSuccursale,
                nom: s.nom,
                ville: s.ville,
                agences: (agencesBySucc.get(String(s.idSuccursale)) || []).length,
                personnel: (usersBySucc.get(String(s.idSuccursale)) || []).filter((u) => u.role === 'ROLE_MANAGER' || u.role === 'ROLE_TECHNICIEN').length
              }))}
              columns={[
                { header: 'ID', accessor: 'idSuccursale' },
                { header: 'Direction', accessor: 'nom' },
                { header: 'Ville', accessor: 'ville' },
                { header: 'Nombre d\'Agences', accessor: 'agences' },
                { header: 'Personnel Régional', accessor: 'personnel' }
              ]}
              fileName="directions-regionales"
              reportTitle="Rapport des Directions Régionales"
            />
          </div>
          <div className="relative h-[42px]">
            <select
              value={selectedSuccursale?.idSuccursale || ''}
              onChange={(e) => setSelectedSuccursaleId(e.target.value)}
              className="h-full appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-4 pr-10 py-2.5 text-sm text-[var(--text-primary)] outline-none cursor-pointer hover:bg-[var(--bg-card-hover)] transition-all"
            >
              {succursales.map((s) => (
                <option key={s.idSuccursale} value={s.idSuccursale} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                  {s.nom} {s.ville ? `— ${s.ville}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
          </div>
        </div>
      </div>

      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          <span className="font-semibold">{typeof apiError === 'string' ? apiError : "Impossible de charger les données."}</span>
        </div>
      )}

      {/* Grid premium cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main card */}
        <div className="xl:col-span-2 glass-card p-6 bg-gradient-to-br from-white/5 to-white/3">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shadow-lg shadow-primary/15">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold text-lg">{selectedSuccursale?.nom || '—'}</h3>
                <div className="flex items-center gap-3 text-[var(--text-secondary)] text-xs mt-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedSuccursale?.ville || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {agencesForSucc.length} agence(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border-color)] px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Accès Admin
            </div>
          </div>

          {/* Assignments row */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 mb-4 text-emerald-200/90 text-xs leading-relaxed">
            <span className="font-semibold text-emerald-300">Affectation exclusive —</span>{' '}
            Les comptes « Manager IT » et « Technicien » ne portent qu’
            <strong className="text-emerald-200">un seul rattachement directionnel</strong> (
            <code className="text-emerald-100/80">idSuccursale</code>). Affecter ici une direction{' '}
            <strong className="text-emerald-200">remplace</strong> toute direction précédente pour ce compte.
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[var(--text-secondary)] text-sm font-semibold">Manager Régional</p>
                <span className="text-[var(--text-muted)] text-xs">{managersForSucc.length} affecté(s)</span>
              </div>
              <div className="flex items-center">
                <select
                  value={assignManagerId}
                  onChange={(e) => setAssignManagerId(e.target.value)}
                  className="flex-1 appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-l-xl rounded-r-none px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-primary/50 transition-all border-r-0"
                >
                  <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Choisir un manager…</option>
                  {regionalManagers.map((u) => (
                    <option key={u.idUtilisateur} value={u.idUtilisateur} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      {u.prenom} {u.nom}
                      {u.succursale ? ` — direction : ${u.succursale}` : ' — non affecté à une direction'}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!assignManagerId || saving || !selectedSuccursale}
                  onClick={() => updateUserSuccursale(assignManagerId, selectedSuccursale.idSuccursale)}
                  className="bg-primary hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed border border-primary text-[var(--text-primary)] px-4 py-2.5 rounded-r-xl transition-all flex items-center justify-center"
                  title="Affecter"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {managersForSucc.length === 0 ? (
                  <span className="text-[var(--text-muted)] text-xs">Aucun manager affecté.</span>
                ) : managersForSucc.map((u) => (
                  <span key={u.idUtilisateur} className={`inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${pillClass('manager')}`}>
                    {u.prenom} {u.nom}
                    <Link2 className="w-3.5 h-3.5 opacity-70" />
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[var(--text-secondary)] text-sm font-semibold">Techniciens Régionaux</p>
                <span className="text-[var(--text-muted)] text-xs">{techsForSucc.length} affecté(s)</span>
              </div>
              <div className="flex items-center">
                <select
                  value={assignTechId}
                  onChange={(e) => setAssignTechId(e.target.value)}
                  className="flex-1 appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-l-xl rounded-r-none px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-emerald-500/50 transition-all border-r-0"
                >
                  <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Choisir un technicien…</option>
                  {regionalTechs.map((u) => (
                    <option key={u.idUtilisateur} value={u.idUtilisateur} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      {u.prenom} {u.nom}
                      {u.succursale ? ` — direction : ${u.succursale}` : ' — non affecté à une direction'}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!assignTechId || saving || !selectedSuccursale}
                  onClick={() => updateUserSuccursale(assignTechId, selectedSuccursale.idSuccursale)}
                  className="bg-emerald-500 hover:bg-emerald-600 border border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-primary)] px-4 py-2.5 rounded-r-xl transition-all flex items-center justify-center"
                  title="Affecter"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {techsForSucc.length === 0 ? (
                  <span className="text-[var(--text-muted)] text-xs">Aucun technicien affecté.</span>
                ) : techsForSucc.map((u) => (
                  <span key={u.idUtilisateur} className={`inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full border ${pillClass('tech')}`}>
                    {u.prenom} {u.nom}
                    <Link2 className="w-3.5 h-3.5 opacity-70" />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Agences list + quick assignment */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[var(--text-secondary)] text-sm font-semibold">Affectation d’Agences</p>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">Déplacez une agence vers cette direction régionale.</p>
              </div>
              <div className="flex items-center lg:w-80 w-full">
                <select
                  value={addAgenceId}
                  onChange={(e) => setAddAgenceId(e.target.value)}
                  className="flex-1 appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-l-xl rounded-r-none px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-amber-500/50 transition-all border-r-0"
                >
                  <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Choisir une agence…</option>
                  {unassignedAgences.map((a) => (
                    <option key={a.idAgence} value={a.idAgence} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
                      {a.nom} {a.succursale ? `— (${a.succursale})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  disabled={!addAgenceId || saving || !selectedSuccursale}
                  onClick={() => updateAgenceSuccursale(addAgenceId, selectedSuccursale.idSuccursale)}
                  className="bg-amber-500 hover:bg-amber-600 border border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-primary)] px-4 py-2.5 rounded-r-xl transition-all flex items-center justify-center shrink-0"
                  title="Affecter"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {agencesForSucc.length === 0 ? (
              <div className="text-[var(--text-muted)] text-sm py-10 text-center">
                Aucune agence dans cette succursale.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {agencesForSucc.map((a) => {
                  const chefs = chefsAgenceFor(a.idAgence);
                  return (
                    <div key={a.idAgence} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 hover:bg-[var(--bg-card-hover)] transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[var(--text-primary)] font-semibold">{a.nom}</p>
                          <p className="text-[var(--text-muted)] text-xs mt-1">{a.ville || '—'}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${pillClass('agence')}`}>
                          Agence
                        </span>
                      </div>

                      <div className="mt-3 space-y-2">
                        <p className="text-[var(--text-secondary)] text-[11px] font-semibold">Responsable</p>
                        {chefs.length === 0 ? (
                          <p className="text-slate-600 text-xs">Aucun chef d’agence lié à cette agence.</p>
                        ) : chefs.map((u) => (
                          <div key={u.idUtilisateur} className="flex items-center justify-between gap-2">
                            <div className="text-[var(--text-secondary)] text-xs">
                              {u.prenom} {u.nom}
                            </div>
                            <span className="text-[var(--text-muted)] text-[10px]">{roleLabel(u.role)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right rail: all succursales cards */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <p className="text-[var(--text-primary)] font-semibold">Grille des directions</p>
            <p className="text-[var(--text-muted)] text-xs mt-1">Cliquez pour ouvrir une succursale.</p>

            <div className="mt-4 space-y-2">
              {succursales.map((s) => {
                const id = String(s.idSuccursale);
                const isActive = String(selectedSuccursale?.idSuccursale) === id;
                const countAg = (agencesBySucc.get(id) || []).length;
                const countPeople = (usersBySucc.get(id) || []).filter((u) => u.role === 'ROLE_MANAGER' || u.role === 'ROLE_TECHNICIEN').length;
                return (
                  <button
                    key={s.idSuccursale}
                    onClick={() => setSelectedSuccursaleId(s.idSuccursale)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-primary/10 border-primary/25 shadow-lg shadow-primary/10'
                        : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[var(--text-primary)] font-semibold">{s.nom}</p>
                        <p className="text-[var(--text-muted)] text-xs mt-1">{s.ville || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[var(--text-primary)] text-sm font-bold tabular-nums">{countAg}</p>
                        <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">Agences</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-2">
                        <Users className="w-4 h-4 text-[var(--text-muted)]" />
                        {countPeople} régional
                      </span>
                      <span className="text-primary text-[11px] font-semibold">Ouvrir</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

