import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { Server, AlertTriangle, ClipboardList, TrendingUp, Activity, CheckCircle, Wrench, Bell, WifiOff } from 'lucide-react';
import { dashboardService, equipmentService } from '../api/api';

const COLORS = ['#10b981', '#f58220', '#f59e0b', '#ef4444', '#6b7280'];

const KpiCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 hover:bg-[var(--bg-card-hover)] transition-all group cursor-default">
    <div className="flex items-start justify-between mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} bg-opacity-20`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-[var(--text-secondary)] text-sm mb-1">{label}</p>
    <p className="text-[var(--text-primary)] text-3xl font-bold tabular-nums">{value ?? '—'}</p>
    {sub && <p className="text-[var(--text-muted)] text-xs mt-1">{sub}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[var(--bg-page)] border border-[var(--border-color)] rounded-xl p-3 shadow-xl">
        <p className="text-slate-300 text-xs mb-2 font-medium">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-[var(--text-primary)] text-sm">
            <span style={{ color: p.fill || p.color }}>{p.name}:</span> {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const EmptyChart = ({ message = 'Aucune donnée disponible' }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <WifiOff className="w-8 h-8 text-slate-600 mx-auto mb-2" />
      <p className="text-[var(--text-muted)] text-xs">{message}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [chartType, setChartType] = useState([]);
  const [chartStatuts, setChartStatuts] = useState([]);
  const [evolution, setEvolution] = useState([]);
  const [recentActivity, setRecentActivity] = useState({ tickets: [], demandes: [] });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [apiErrorKind, setApiErrorKind] = useState(null); // 'network' | 'forbidden' | 'unauthorized' | null

  const { canAccess } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!canAccess('dashboard')) {
      navigate('/parc');
      return;
    }

    const fetchAll = async () => {
      try {
        const [statsRes, typeRes, evolutionRes, historiqueRes, alertesRes] = await Promise.allSettled([
          dashboardService.getStats(),
          dashboardService.getParType(),
          dashboardService.getEvolution(),
          dashboardService.getHistorique(),
          equipmentService.getAlertes(),
        ]);

        let anySuccess = false;
        const settled = [statsRes, typeRes, evolutionRes, historiqueRes];
        const statuses = settled
          .filter(r => r.status === 'rejected')
          .map(r => r.reason?.response?.status)
          .filter(Boolean);

        if (statsRes.status === 'fulfilled') {
          anySuccess = true;
          const d = statsRes.value.data;
          setKpis({
            total:               d.equipements?.total          || 0,
            affecte:             d.equipements?.affectes        || 0,
            en_stock:            d.equipements?.disponibles     || 0,
            hors_service:        d.equipements?.enPanne         || 0,
            tickets_ouverts:     d.equipements?.maintenance     || 0,
            demandes_en_attente: d.alertes?.demandesEnAttente   || 0,
            alertes_actives:     alertesRes.status === 'fulfilled' ? alertesRes.value.data.length : ((d.alertes?.garantiesExpirees || 0) + (d.alertes?.amortissementsDepasses || 0)),
            garanties_expirant:  d.alertes?.garantiesExpirees   || 0,
          });
          setChartStatuts([
            { name: 'Disponible',  value: d.equipements?.disponibles || 0, color: '#10b981' },
            { name: 'Affecté',     value: d.equipements?.affectes    || 0, color: '#f58220' },
            { name: 'Maintenance', value: d.equipements?.maintenance || 0, color: '#f59e0b' },
            { name: 'En Panne',    value: d.equipements?.enPanne     || 0, color: '#ef4444' },
            { name: 'Retiré',      value: d.equipements?.retires     || 0, color: '#6b7280' },
          ]);
        }

        if (typeRes.status === 'fulfilled') {
          anySuccess = true;
          const types = typeRes.value.data || [];
          setChartType(types.map(t => ({
            type:     t.type || t.libelle || t.nom || 'Inconnu',
            total:    t.total || 0,
          })));
        }

        if (evolutionRes.status === 'fulfilled') {
          anySuccess = true;
          const evo = evolutionRes.value.data || [];
          if (Array.isArray(evo)) {
            setEvolution(evo);
          }
        }

        if (historiqueRes.status === 'fulfilled') {
          anySuccess = true;
          const logs = historiqueRes.value.data || [];
          setRecentActivity({
            tickets: [],
            demandes: logs.slice(0, 4).map(l => ({
              id:             l.idAudit || l.id,
              type:           l.action,
              agence:         l.details ? JSON.stringify(l.details).substring(0, 30) : '',
              statut:         'APPROUVEE',
              statut_display: l.action,
            })),
          });
        }

        if (!anySuccess) {
          setApiError(true);
          // Si l'API répond mais refuse (RBAC backend), ne pas afficher "backend down"
          if (statuses.includes(403)) setApiErrorKind('forbidden');
          else if (statuses.includes(401)) setApiErrorKind('unauthorized');
          else setApiErrorKind('network');
        } else {
          setApiError(false);
          setApiErrorKind(null);
        }

      } catch (err) {
        const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Erreur réseau";
        setApiError(errorMsg);
        setApiErrorKind('network');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] text-sm">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const data = kpis || { total: 0, affecte: 0, en_stock: 0, hors_service: 0, tickets_ouverts: 0, demandes_en_attente: 0, alertes_actives: 0, garanties_expirant: 0 };

  return (
    <div className="space-y-6 animate-fade-in">
      {apiError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          {apiErrorKind === 'forbidden'
            ? "Accès refusé (403) : l'API est OK, mais votre compte n'a pas les droits pour le Dashboard."
            : apiErrorKind === 'unauthorized'
              ? "Session expirée (401). Reconnectez-vous."
              : (typeof apiError === 'string' ? apiError : "Impossible de se connecter à l'API.")
          }
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={Server}        label="Total Matériel"        value={data.total}               sub={`${data.affecte} affectés`}     color="bg-primary"    trend={undefined} />
        <KpiCard icon={CheckCircle}   label="En Stock"              value={data.en_stock}            sub="Disponibles"                    color="bg-emerald-500" trend={undefined} />
        <KpiCard icon={Wrench}        label="En Maintenance"        value={data.tickets_ouverts}     sub="En cours de traitement"         color="bg-amber-500"  />
        <KpiCard icon={ClipboardList} label="Demandes en Attente"   value={data.demandes_en_attente} sub="Workflow actif"                 color="bg-blue-500"   />
      </div>

      {/* Row 2 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard icon={AlertTriangle} label="Hors Service"        value={data.hors_service}      sub="À traiter"                       color="bg-red-500"    />
        <KpiCard icon={Bell}          label="Centre d'Alertes"    value={data.alertes_actives}   sub="Toutes alertes confondues"       color="bg-purple-500" />
        <KpiCard icon={TrendingUp}    label="Garanties Expirées"  value={data.garanties_expirant} sub="Déjà échues et à traiter"       color="bg-orange-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Bar Chart par type */}
        <div className="xl:col-span-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[var(--text-primary)] font-semibold">Répartition par Type</h2>
              <p className="text-[var(--text-secondary)] text-xs mt-0.5">Total par catégorie d'équipement</p>
            </div>
            <Activity className="w-5 h-5 text-[var(--text-muted)]" />
          </div>
          {chartType.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartType} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Bar dataKey="total" name="Total" fill="#f58220" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 280 }}><EmptyChart message="Aucune donnée de type disponible depuis l'API" /></div>
          )}
        </div>

        {/* Pie Chart statuts */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="text-[var(--text-primary)] font-semibold">État du Parc</h2>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5">Distribution globale</p>
          </div>
          {chartStatuts.some(s => s.value > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={chartStatuts} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                  dataKey="value" strokeWidth={0}>
                  {chartStatuts.map((entry, index) => (
                    <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 240 }}><EmptyChart message="Aucune donnée de statut" /></div>
          )}
        </div>
      </div>

      {/* Line Chart - Evolution */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[var(--text-primary)] font-semibold">Évolution du Parc</h2>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5">Acquisitions vs Retraits sur les derniers mois</p>
          </div>
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        {evolution.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mois" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Line type="monotone" dataKey="acquisitions" name="Acquisitions" stroke="#f58220" strokeWidth={2} dot={{ fill: '#f58220', r: 4 }} />
              <Line type="monotone" dataKey="retraits"     name="Retraits"     stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 4 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 220 }}><EmptyChart message="Données d'évolution non disponibles depuis l'API" /></div>
        )}
      </div>

      {/* Activité récente */}
      {recentActivity.demandes.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
          <h2 className="text-[var(--text-primary)] font-semibold mb-4">Activité Récente</h2>
          <div className="space-y-3">
            {recentActivity.demandes.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-[var(--bg-card-hover)] rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium truncate">{d.type}</p>
                  <p className="text-[var(--text-secondary)] text-xs">{d.agence}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                  {d.statut_display}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
