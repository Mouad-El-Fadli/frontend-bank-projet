/**
 * ErrorBoundary — Capture les erreurs React et affiche un message propre
 * au lieu d'une page blanche silencieuse.
 */
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Erreur capturée:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-white font-semibold text-lg mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-slate-400 text-sm mb-1 max-w-md">
            Cette page a rencontré un problème et ne peut pas s'afficher.
          </p>
          <p className="text-slate-600 text-xs font-mono mb-6 max-w-md bg-white/5 rounded-lg px-3 py-2">
            {this.state.error?.message || 'Erreur inconnue'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-accent text-white rounded-xl text-sm font-medium transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
