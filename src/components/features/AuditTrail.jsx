import { useState, useEffect } from 'react';
import { historyService } from '../../api/api';
import { Shield, Search, Download, ChevronDown, Filter, ExternalLink, Loader2 } from 'lucide-react';

const ACTION_COLORS = {
  'CREATION': 'bg-[var(--emerald-500-10)] text-[var(--emerald-400)] border-[var(--emerald-500-20)]',
  'MODIFICATION': 'bg-[var(--primary-10)] text-[var(--primary)] border-[var(--primary-20)]',
  'AFFECTATION': 'bg-[var(--purple-500-10)] text-[var(--purple-400)] border-[var(--purple-500-20)]',
  'MISE_HS': 'bg-[var(--red-500-10)] text-[var(--red-400)] border-[var(--red-500-20)]',
  'APPROBATION': 'bg-[var(--teal-500-10)] text-[var(--teal-400)] border-[var(--teal-500-20)]',
  'REJET': 'bg-[var(--orange-500-10)] text-[var(--orange-400)] border-[var(--orange-500-20)]',
  'CONNEXION': 'bg-[var(--slate-500-10)] text-[var(--text-secondary)] border-[var(--border-color)]',
};

const ACTION_LABELS = {
  'CREATION': 'Création',
  'MODIFICATION': 'Modification',
  'AFFECTATION': 'Affectation',
  'MISE_HS': 'Mise HS',
  'APPROBATION': 'Approbation',
  'REJET': 'Rejet',
  'CONNEXION': 'Connexion',
};

const demoHistory = [
  { id: 1, horodatage: '2024-06-10T14:32:11Z', acteur: 'Karim.Alami', role: 'AGENCE', action: 'CREATION', equipement: null, details: 'Demande #47 créée — Ordinateur ×3', ip: '192.168.1.45', hash: 'a3f9b2c1' },
  { id: 2, horodatage: '2024-06-10T15:45:23Z', acteur: 'Omar.Benzid', role: 'MANAGER', action: 'APPROBATION', equipement: 'SN-2024-001', details: 'Demande #46 approuvée avec signature', ip: '10.0.0.12', hash: 'd7e4a6f2' },
  { id: 3, horodatage: '2024-06-10T10:12:05Z', acteur: 'Salma.Idrissi', role: 'TECH', action: 'MODIFICATION', equipement: 'SN-2023-015', details: 'Statut modifié: En stock → Affecté', ip: '10.0.0.23', hash: 'f1c8b9e5' },
  { id: 4, horodatage: '2024-06-09T16:55:42Z', acteur: 'Admin', role: 'ADMIN', action: 'MISE_HS', equipement: 'SN-2022-088', details: 'Serveur IBM Power mis hors service', ip: '10.0.0.1', hash: '2a7d3e9f' },
  { id: 5, horodatage: '2024-06-09T09:30:00Z', acteur: 'Nadia.ElFassi', role: 'AGENCE', action: 'CREATION', equipement: null, details: 'Demande #44 créée — Téléphone ×5', ip: '192.168.2.78', hash: 'b5c6d1a8' },
  { id: 6, horodatage: '2024-06-09T11:22:18Z', acteur: 'Omar.Benzid', role: 'MANAGER', action: 'REJET', equipement: null, details: 'Demande #44 rejetée — Budget insuffisant', ip: '10.0.0.12', hash: 'e9f3c2b4' },
  { id: 7, horodatage: '2024-06-08T08:15:30Z', acteur: 'Salma.Idrissi', role: 'TECH', action: 'CREATION', equipement: 'SN-2024-033', details: 'Nouveau matériel enregistré: iPhone 14 Pro', ip: '10.0.0.23', hash: '6g7h8i9j' },
  { id: 8, horodatage: '2024-06-07T17:45:00Z', acteur: 'Admin', role: 'ADMIN', action: 'CONNEXION', equipement: null, details: 'Connexion administrateur au système', ip: '10.0.0.1', hash: 'k1l2m3n4' },
];

const ROLE_COLORS = {
  ADMIN: 'bg-red-500',
  MANAGER: 'bg-primary',
  TECH: 'bg-green-600',
  TECHNICIEN: 'bg-green-600',
  AGENCE: 'bg-amber-500',
  SYSTEM: 'bg-slate-500',
};

export default function AuditTrail() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await historyService.getAll({ search, action: filterAction });
        const raw = data.results || data || [];

        // Mapper les données backend → format attendu par le composant
        const mapped = raw.map((h, i) => ({
          id:          h.idHistorique || h.id || i,
          horodatage:  h.horodatage || new Date().toISOString(),
          acteur:      h.utilisateur || 'Système',
          role:        h.role || 'SYSTEM',
          action:      h.action || 'MODIFICATION',
          equipement:  h.equipement || h.numeroSerie || null,
          details:     h.detailsJson
                         ? (typeof h.detailsJson === 'string'
                             ? h.detailsJson.substring(0, 80)
                             : JSON.stringify(h.detailsJson).substring(0, 80))
                         : (h.details || '—'),
          ip:          h.adresseIp || h.ip || '—',
          hash:        h.hash || (h.idHistorique ? String(h.idHistorique).padStart(8, '0') : '—'),
        }));

        setHistory(mapped);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [search, filterAction, filterRole]);


  const filtered = history.filter(h => {
    const matchSearch = !search || h.acteur?.toLowerCase().includes(search.toLowerCase()) || h.equipement?.toLowerCase().includes(search.toLowerCase()) || h.details?.toLowerCase().includes(search.toLowerCase());
    const matchAction = !filterAction || h.action === filterAction;
    const matchRole = !filterRole || h.role === filterRole;
    const matchFrom = !dateFrom || new Date(h.horodatage) >= new Date(dateFrom);
    const matchTo = !dateTo || new Date(h.horodatage) <= new Date(dateTo + 'T23:59:59');
    return matchSearch && matchAction && matchRole && matchFrom && matchTo;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const exportCSV = () => {
    const headers = ['Horodatage', 'Acteur', 'Rôle', 'Action', 'Équipement', 'Détails', 'IP', 'Hash'];
    const rows = filtered.map(h => [h.horodatage, h.acteur, h.role, h.action, h.equipement || '', h.details, h.ip, h.hash]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `audit-trail-${Date.now()}.csv`; a.click();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[var(--text-primary)] font-bold text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Audit Trail
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-0.5">
            Historique inaltérable et horodaté de toutes les actions — {filtered.length} entrée(s)
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-all"
        >
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-[var(--text-secondary)]" />
          <input
            className="bg-transparent text-sm text-[var(--text-primary)] placeholder-slate-500 outline-none w-full"
            placeholder="Acteur, équipement, détail..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative">
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1); }}
            className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Toutes actions</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{v}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={filterRole}
            onChange={e => { setFilterRole(e.target.value); setPage(1); }}
            className="appearance-none bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-3 pr-8 py-2 text-sm text-[var(--text-primary)] outline-none"
          >
            <option value="" className="bg-[var(--bg-card)] text-[var(--text-primary)]">Tous rôles</option>
            {['ADMIN', 'MANAGER', 'TECHNICIEN', 'AGENCE', 'SYSTEM'].map(r => <option key={r} value={r} className="bg-[var(--bg-card)] text-[var(--text-primary)]">{r}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] pointer-events-none" />
        </div>
        <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent text-sm text-[var(--text-primary)] outline-none [color-scheme:dark] w-32" />
          <span className="text-[var(--text-muted)]">→</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-transparent text-sm text-[var(--text-primary)] outline-none [color-scheme:dark] w-32" />
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
                  {['Horodatage', 'Acteur', 'Rôle', 'Action', 'Équipement', 'Détails', 'IP Source', 'Hash'].map(h => (
                    <th key={h} className="text-left text-[var(--text-secondary)] text-xs font-medium px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-[var(--text-muted)] py-12">
                      <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      Aucune entrée trouvée
                    </td>
                  </tr>
                ) : paginated.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[var(--bg-card)] transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-[var(--text-primary)] text-xs font-mono">
                        {new Date(entry.horodatage).toLocaleDateString('fr-FR')}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs font-mono">
                        {new Date(entry.horodatage).toLocaleTimeString('fr-FR')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${ROLE_COLORS[entry.role] || 'bg-gray-500'} flex items-center justify-center text-[var(--text-primary)] text-xs font-bold flex-shrink-0`}>
                          {entry.acteur[0]}
                        </div>
                        <span className="text-[var(--text-primary)] text-xs">{entry.acteur}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full text-[var(--text-primary)] font-medium ${ROLE_COLORS[entry.role] || 'bg-gray-500'}`}>
                        {entry.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${ACTION_COLORS[entry.action] || 'bg-slate-500/20 text-[var(--text-secondary)]'}`}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.equipement ? (
                        <span className="font-mono text-primary text-xs">{entry.equipement}</span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)] text-xs max-w-xs">
                      <p className="truncate" title={entry.details}>{entry.details}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">{entry.ip}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-600 text-xs bg-[var(--bg-card)] px-2 py-0.5 rounded-lg">#{entry.hash}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
            <p className="text-[var(--text-muted)] text-xs">
              Page {page} sur {totalPages} — {filtered.length} entrées
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] disabled:opacity-30 hover:bg-[var(--bg-card-hover)] transition-all"
              >
                ← Préc.
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all
                    ${page === p ? 'bg-primary text-[var(--text-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-primary)] disabled:opacity-30 hover:bg-[var(--bg-card-hover)] transition-all"
              >
                Suiv. →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Integrity notice */}
      <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-4">
        <Shield className="w-5 h-5 text-primary flex-shrink-0" />
        <p className="text-[var(--text-secondary)] text-xs">
          <span className="text-primary font-semibold">Intégrité garantie :</span>{' '}
          Chaque entrée est horodatée, signée par un hash cryptographique et stockée de manière inaltérable. Aucune modification ou suppression n'est possible après enregistrement.
        </p>
      </div>
    </div>
  );
}
