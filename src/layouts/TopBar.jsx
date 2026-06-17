import { Bell, Menu, Clock, ArrowRight, HelpCircle, X, LayoutDashboard, Package, GitBranch, ClipboardList, PenTool, ShieldCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // IMPORT CRUCIAL
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { alertService } from '../api/api';

const LS_KEY = 'alertes_lues';
const getReadIds  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };

const pageTitles = {
  '/': 'Tableau de Bord',
  '/parc': 'Gestion du Parc Matériel',
  '/affectations': 'Affectations',
  '/workflow': 'Demandes & Workflow',
  '/audit': 'Audit Trail',
};

// COMPOSANT PORTAL DEFINITIF
// COMPOSANT PORTAL DEFINITIF - STRUCTURE STRICTE
function HelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 sm:p-6">
      
      <div className="w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* 3. CONTENU SCROLLABLE (Astuces & Guide) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                <HelpCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-extrabold text-2xl text-slate-900">Guide d'Utilisation Professionnel</h3>
                <p className="text-sm text-slate-500 font-medium italic">"Maîtrisez votre plateforme IT comme un expert."</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <HelpCard icon={LayoutDashboard} title="Tableau de Bord" color="blue" description="Visualisez les indicateurs de performance (KPIs) et les statistiques du parc en temps réel." />
            <HelpCard icon={Package} title="Parc Matériel" color="emerald" description="Inventaire complet. Accédez aux détails techniques et exportez vos données en un clic." />
            <HelpCard icon={GitBranch} title="Affectations" color="amber" description="Suivez les mouvements de matériel entre les agences et les collaborateurs." />
            <HelpCard icon={ClipboardList} title="Workflow & Pannes" color="purple" description="Signalez des incidents et gérez le cycle de vie de la résolution des pannes." />
            <HelpCard icon={PenTool} title="Maintenance" color="rose" description="Planning des interventions préventives pour garantir la longévité de vos équipements." />
            <HelpCard icon={ShieldCheck} title="Audit Trail" color="slate" description="Transparence totale. Historique de sécurité de toutes les actions effectuées." />
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-4">
            <div className="text-primary mt-1">💡</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong>Conseil de Productivité :</strong> Utilisez le **Chatbot IA** (en bas à droite) pour des recherches ultra-rapides ou pour obtenir de l'aide sur une procédure technique complexe.
            </p>
          </div>
        </div>

        {/* 4. FOOTER FIXE */}
        <div className="shrink-0 bg-slate-50 p-5 border-t flex justify-between items-center rounded-b-2xl">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">BANQUE POPULAIRE — GESTION DE PARC IT V2.0</span>
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-accent transition-all active:scale-95 text-xs uppercase"
          >
            J'ai compris
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

function HelpCard({ icon: Icon, title, description, color }) {
  const colors = {
    blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500',
    purple: 'bg-purple-500', rose: 'bg-rose-500', slate: 'bg-slate-800'
  };
  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-md transition-all group">
      <div className="flex items-center gap-4 mb-3">
        <div className={`p-2.5 rounded-xl text-white shadow-lg ${colors[color]} shadow-${color}-500/20`}><Icon className="w-5 h-5" /></div>
        <h4 className="font-bold text-slate-900">{title}</h4>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}

export default function TopBar({ collapsed, onMenuToggle }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [alertes, setAlertes] = useState([]);

  // Logique Alertes...
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const { data } = await alertService.getAll();
        const readIds = getReadIds();
        const raw = (Array.isArray(data) ? data : []).map(a => ({
          ...a,
          lue: readIds.includes(a.id || a.idAlerte),
        }));
        setAlertes(raw);
      } catch (e) {
        console.error("Erreur alertes navbar:", e);
      }
    };
    if (user) fetchAlerts();
  }, [location.pathname, user]);

  const unreadCount = alertes.filter(a => !a.lue).length;
  const topAlertes = alertes.slice(0, 4);
  const pageTitle = pageTitles[location.pathname] || 'Gestion Matériel';

  return (
    <header className="h-16 bg-[var(--bg-card)] backdrop-blur-md border-b border-[var(--border-color)] flex items-center px-6 gap-4 sticky top-0 z-30">
      <button onClick={onMenuToggle} className="p-2 lg:hidden">
        <Menu className="w-5 h-5 text-slate-500" />
      </button>

      <div className="flex-1">
        <div key={location.pathname} className="animate-slide-up">
          <h1 className="text-[var(--text-primary)] font-bold text-xl tracking-tight">{pageTitle}</h1>
          <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 justify-center">
        <button 
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-2 px-6 py-2 rounded-2xl bg-primary text-white shadow-xl shadow-primary/30 hover:bg-accent transition-all active:scale-95 group border-2 border-white/20"
        >
          <HelpCircle className="w-5 h-5 animate-pulse" />
          <span className="text-sm font-extrabold whitespace-nowrap">Besoin d'Aide ? — Guide Pro</span>
        </button>
      </div>

      <div className="flex-1 flex justify-end items-center gap-3">
        <div className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="p-2.5 rounded-xl text-slate-400 hover:bg-[var(--bg-card-hover)] relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-4 z-[40]">
              {/* Contenu notifications... */}
            </div>
          )}
        </div>
      </div>

      {/* TÉLÉPORTATION VIA PORTAL */}
      <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </header>
  );
}
