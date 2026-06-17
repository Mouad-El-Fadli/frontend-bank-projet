import { useState, useEffect, useRef, useCallback } from 'react';
import { messageService } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import {
  MessageCircle, Send, Search, Plus, ArrowLeft,
  User, Users, Check, CheckCheck, Loader2, X
} from 'lucide-react';

const ROLE_COLORS = {
  ROLE_ADMIN:      'bg-red-500',
  ROLE_MANAGER:    'bg-primary',
  ROLE_TECHNICIEN: 'bg-green-600',
  ROLE_AGENCE:     'bg-amber-500',
};

const ROLE_SHORT = {
  ROLE_ADMIN: 'Admin',
  ROLE_MANAGER: 'Manager',
  ROLE_TECHNICIEN: 'Tech',
  ROLE_AGENCE: 'Agence',
};

const Avatar = ({ nom, prenom, role, size = 'w-10 h-10' }) => {
  const initials = `${(prenom || '')[0] || ''}${(nom || '')[0] || ''}`.toUpperCase();
  const bg = ROLE_COLORS[role] || 'bg-slate-600';
  return (
    <div className={`${size} rounded-full ${bg} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
      {initials}
    </div>
  );
};

// ── Modale Nouveau Message ──────────────────────────────────────────
const NewConvoModal = ({ onClose, onSelect }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    messageService.getUsers()
      .then(r => setUsers(r.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return `${u.prenom} ${u.nom} ${u.email} ${u.role} ${u.succursale || ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Nouvelle Conversation
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 bg-black/20 border border-[var(--border-color)] rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Chercher un collègue..."
              className="bg-transparent text-sm text-[var(--text-primary)] outline-none w-full placeholder:text-slate-500"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] text-sm py-8">Aucun utilisateur trouvé</p>
          ) : filtered.map(u => (
            <button
              key={u.id}
              onClick={() => onSelect(u)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors text-left"
            >
              <Avatar nom={u.nom} prenom={u.prenom} role={u.role} />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] text-sm font-medium truncate">{u.prenom} {u.nom}</p>
                <p className="text-[var(--text-muted)] text-xs truncate">
                  {ROLE_SHORT[u.role] || u.role} {u.succursale ? `• ${u.succursale}` : ''} {u.agence ? `• ${u.agence}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Page Principale ─────────────────────────────────────────────────
export default function Messagerie() {
  const { user } = useAuth();
  const myId = user?.idUtilisateur || user?.id;

  const [convos, setConvos] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Charger les conversations
  const fetchConvos = useCallback(async () => {
    try {
      const { data } = await messageService.getConversations();
      setConvos(data || []);
    } catch { /* silent */ }
    finally { setLoadingConvos(false); }
  }, []);

  useEffect(() => {
    fetchConvos();
    // Polling toutes les 5s pour les nouvelles conversations
    pollRef.current = setInterval(fetchConvos, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchConvos]);

  // Charger le thread sélectionné
  const fetchThread = useCallback(async (partnerId, isPolling = false) => {
    if (!partnerId) return;
    if (!isPolling) setLoadingThread(true);
    try {
      const { data } = await messageService.getThread(partnerId);
      setMessages(data?.messages || []);
    } catch (e) {
      console.error('Erreur fetchThread:', e);
      if (!isPolling) setMessages([]);
    }
    finally { 
      if (!isPolling) setLoadingThread(false); 
    }
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      fetchThread(selectedPartner.id, false);
      // Polling toutes les 10s pour le thread actif (en mode silencieux)
      const tid = setInterval(() => fetchThread(selectedPartner.id, true), 10000);
      return () => clearInterval(tid);
    }
  }, [selectedPartner, fetchThread]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Si on vient du Chatbot avec un message pré-rempli
  useEffect(() => {
    if (location.state?.prefill) {
      setInput(location.state.prefill);
      // Nettoyer l'état de l'historique pour éviter de le remettre au refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleSend = async () => {
    if (!input.trim() || !selectedPartner || sending) return;
    setSending(true);
    try {
      await messageService.send({ idDestinataire: selectedPartner.id, contenu: input.trim() });
      setInput('');
      fetchThread(selectedPartner.id, true); // reload sans flicker
      fetchConvos();
    } catch (e) { 
      console.error('Erreur handleSend:', e);
      const errMsg = e.response?.data?.error || e.response?.data?.msg || e.message;
      alert("Erreur: " + errMsg);
    }
    finally { setSending(false); }
  };

  const selectPartner = (partner) => {
    setSelectedPartner(partner);
    setMobileShowThread(true);
    setShowNewConvo(false);
  };

  const handleNewConvo = (u) => {
    selectPartner({
      id: u.id,
      nom: u.nom,
      prenom: u.prenom,
      role: u.role,
      succursale: u.succursale,
    });
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-100px)] flex gap-0 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
      {/* ── Panneau Gauche : Conversations ──────────────────────────────── */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-[var(--border-color)] flex flex-col ${mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <h2 className="text-[var(--text-primary)] font-bold text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" /> Messages
          </h2>
          <button
            onClick={() => setShowNewConvo(true)}
            className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            title="Nouvelle conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Liste conversations */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingConvos ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : convos.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-[var(--text-muted)] text-sm">Aucune conversation</p>
              <button onClick={() => setShowNewConvo(true)} className="mt-3 text-primary text-sm font-medium hover:underline">
                Démarrer une discussion
              </button>
            </div>
          ) : convos.map(c => (
            <button
              key={c.partner.id}
              onClick={() => selectPartner(c.partner)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors text-left border-b border-[var(--border-color)]/50 ${
                selectedPartner?.id === c.partner.id ? 'bg-primary/5 border-l-2 border-l-primary' : ''
              }`}
            >
              <div className="relative">
                <Avatar nom={c.partner.nom} prenom={c.partner.prenom} role={c.partner.role} />
                {c.unread > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {c.unread > 9 ? '9+' : c.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium truncate ${c.unread > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {c.partner.prenom} {c.partner.nom}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 ml-2">{formatTime(c.lastMessage?.creeLe)}</span>
                </div>
                <p className={`text-xs truncate mt-0.5 ${c.unread > 0 ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}`}>
                  {c.lastMessage?.isMe ? 'Vous : ' : ''}{c.lastMessage?.contenu}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Panneau Droit : Thread ──────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
        {selectedPartner ? (
          <>
            {/* Header thread */}
            <div className="p-4 border-b border-[var(--border-color)] flex items-center gap-3">
              <button onClick={() => setMobileShowThread(false)} className="md:hidden p-1.5 rounded-lg hover:bg-[var(--border-color)]">
                <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
              </button>
              <Avatar nom={selectedPartner.nom} prenom={selectedPartner.prenom} role={selectedPartner.role} />
              <div>
                <p className="text-[var(--text-primary)] font-semibold text-sm">{selectedPartner.prenom} {selectedPartner.nom}</p>
                <p className="text-[var(--text-muted)] text-xs">
                  {ROLE_SHORT[selectedPartner.role] || ''} {selectedPartner.succursale ? `• ${selectedPartner.succursale}` : ''}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {loadingThread && messages.length === 0 ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-[var(--text-muted)] text-sm">Aucun message. Dites bonjour ! 👋</p>
                </div>
              ) : messages.map(m => {
                const isMe = m.idExpediteur === myId;
                return (
                  <div key={m.idMessage} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-primary text-white rounded-tr-sm shadow-lg shadow-primary/20'
                        : 'bg-white/5 border border-white/10 text-[var(--text-primary)] rounded-tl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.contenu}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                        <span className={`text-[10px] ${isMe ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                          {formatTime(m.creeLe)}
                        </span>
                        {isMe && (m.lu ? <CheckCheck className="w-3 h-3 text-blue-300" /> : <Check className="w-3 h-3 text-white/40" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[var(--border-color)] flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Écrire un message..."
                className="flex-1 bg-white/5 border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-primary/50 placeholder:text-slate-500"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="bg-primary hover:bg-accent text-white p-2.5 rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-[var(--text-primary)] font-semibold text-lg mb-1">Messagerie Interne</h3>
              <p className="text-[var(--text-muted)] text-sm mb-4 max-w-xs">Sélectionnez une conversation ou démarrez-en une nouvelle</p>
              <button
                onClick={() => setShowNewConvo(true)}
                className="px-5 py-2.5 bg-primary hover:bg-accent text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-4 h-4 inline mr-2" /> Nouveau Message
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modale nouvelle conversation */}
      {showNewConvo && <NewConvoModal onClose={() => setShowNewConvo(false)} onSelect={handleNewConvo} />}
    </div>
  );
}
