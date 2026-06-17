import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { equipmentService } from '../api/api';
import { Building2, Package, Tag, Zap, Fingerprint, GitBranch, ArrowLeft, Loader2 } from 'lucide-react';

const STATUT_LABELS = {
  DISPONIBLE: 'Disponible',
  AFFECTE: 'Affecté',
  EN_MAINTENANCE: 'En Maintenance',
  EN_PANNE: 'En Panne',
  RETIRE: 'Retiré',
};

const STATUT_COLORS = {
  DISPONIBLE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  AFFECTE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  EN_MAINTENANCE: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  EN_PANNE: 'bg-red-500/10 text-red-500 border-red-500/20',
  RETIRE: 'bg-slate-500/15 text-slate-500 border-slate-500/20',
};

export default function PublicScan() {
  const { numeroSerie } = useParams();
  const [equipment, setEquipment] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    equipmentService.getPublicInfo(numeroSerie)
      .then(res => {
        setEquipment(res.data);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [numeroSerie]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-300 flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-medium animate-pulse">Chargement des informations...</p>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-300 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-[#1e293b] border border-red-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
          <Zap className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Équipement introuvable</h2>
          <p className="text-sm text-slate-400 mb-6">Le numéro de série "{numeroSerie}" n'existe pas dans le registre de la banque.</p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour au portail
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-300 flex flex-col items-center sm:justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8 mt-4 sm:mt-0">
          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Banque Populaire</h1>
          <p className="text-blue-400 text-sm font-medium tracking-wide uppercase mt-1">Fiche Matériel</p>
        </div>

        {/* Info Card */}
        <div className="bg-[#1e293b] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          {/* Decors */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">N° de Série</p>
              <div className="flex items-center gap-2 font-mono text-lg text-white">
                <Fingerprint className="w-4 h-4 text-blue-400" />
                {equipment.numeroSerie}
              </div>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${STATUT_COLORS[equipment.statut] || STATUT_COLORS.DISPONIBLE}`}>
              {STATUT_LABELS[equipment.statut] || equipment.statut}
            </span>
          </div>

          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center flex-shrink-0 border border-white/5">
                <Tag className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">Modèle / Marque</p>
                <p className="text-white font-semibold">{equipment.modele}</p>
                <p className="text-sm text-slate-400">{equipment.marque}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center flex-shrink-0 border border-white/5">
                <GitBranch className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">Type de Matériel</p>
                <p className="text-white font-semibold">{equipment.typeMateriel}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center flex-shrink-0 border border-white/5">
                <Building2 className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium mb-0.5">Localisation / Agence</p>
                <p className="text-white font-semibold">{equipment.agence}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8">
          <Link to="/login" className="text-sm text-slate-500 hover:text-white transition-colors font-medium">
            Accéder au portail interne
          </Link>
        </div>
      </div>
    </div>
  );
}
