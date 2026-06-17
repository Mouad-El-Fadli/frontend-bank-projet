import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, User, Loader2 } from 'lucide-react';
import { alerts } from '../utils/alerts';


const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login({ username, password });
      if (result.success) {
        alerts.toast('Connexion réussie !');
        navigate('/');
      } else {
        alerts.error('Échec de connexion', result.error);
      }
    } catch (err) {
      alerts.error('Erreur technique', 'Impossible de joindre le serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] px-4 overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px]" />

      <div className="max-w-md w-full relative animate-slide-up">
        <div className="bg-[var(--bg-card)] backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-[var(--border-color)]">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg shadow-primary/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Banque Populaire</h2>
            <p className="text-[var(--text-secondary)] mt-2 text-sm uppercase tracking-widest font-medium">Gestion Matériel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Nom d'utilisateur</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  type="text" 
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] pl-11 pr-4 py-3.5 rounded-xl text-[var(--text-primary)] placeholder-slate-500 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  placeholder="votre.nom"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">Mot de passe</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                </div>
                <input 
                  type="password" 
                  className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] pl-11 pr-4 py-3.5 rounded-xl text-[var(--text-primary)] placeholder-slate-500 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-accent text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authentification...
                </>
              ) : (
                'Se Connecter'
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-[var(--border-color)] text-center">
            <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold tracking-widest">
              Grandir. Ensemble.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
