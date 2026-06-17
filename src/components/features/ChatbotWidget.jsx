import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { chatbotService, dashboardService, equipmentService } from '../../api/api';
import {
  MessageSquare, X, Send, Bot, Maximize2, Minimize2,
  ThumbsUp, ThumbsDown, Database, Cpu, ChevronDown, ChevronUp,
  Share2, RefreshCw, User, Minus
} from 'lucide-react';

const MIN_W = 340, MIN_H = 420, MAX_W = 700;
const DEFAULT_W = 420, DEFAULT_H = 600;
const EXPANDED_W = 620, EXPANDED_H = 720;

// ── Suggestions par page ─────────────────────────────────────
const PAGE_SUGGESTIONS = {
  '/':            ['État du parc',       'Alertes actives',     'Demandes en attente'],
  '/parc':        ['Équipements en panne','Stock disponible',    'Dernier ajout'],
  '/maintenance': ['Pannes en cours',    'Équipements HS',      'Interventions récentes'],
  '/alertes':     ['Garanties expirées', 'Alertes critiques',   'Que faire ?'],
  '/affectations':['Affectations récentes','Retourner matériel','PV affectation'],
  '/workflow':    ['Demandes en attente','Valider demande',     'Créer une demande'],
  '/utilisateurs':['Liste comptes',      'Rôles disponibles',   'Créer un compte'],
  '/directions':  ['Directions actives', 'Agences rattachées',  'Ajouter direction'],
};
const DEFAULT_SUGGESTIONS = ['Aide Technique', 'État du Matériel', 'Signaler une Panne', 'Guide Utilisateur'];

// ── Rendu Markdown stylisé ────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={key++} className="my-2 space-y-1 pl-1">
          {listBuffer.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-slate-700">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  const inlineFormat = (str) =>
    str
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-slate-100 text-primary px-1 rounded font-mono text-[11px]">$1</code>');

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); elements.push(<div key={key++} className="h-2" />); return; }

    // Titre ## ou ###
    if (/^#{1,3}\s/.test(trimmed)) {
      flushList();
      const content = trimmed.replace(/^#+\s/, '');
      elements.push(
        <p key={key++} className="font-bold text-slate-800 text-sm mt-3 mb-1 border-b border-slate-100 pb-1">
          {content}
        </p>
      );
      return;
    }

    // Bullet - ou *
    if (/^[-*•]\s/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^[-*•]\s/, ''));
      return;
    }

    // Numéroté 1. 2.
    if (/^\d+\.\s/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^\d+\.\s/, ''));
      return;
    }

    // Ligne normale
    flushList();
    elements.push(
      <p key={key++} className="text-slate-700 leading-relaxed text-[13.5px]"
        dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }} />
    );
  });

  flushList();
  return <div className="space-y-1">{elements}</div>;
}

// ── Badge confiance ───────────────────────────────────────────
const ConfidenceBadge = ({ confiance }) => {
  if (!confiance) return null;
  const { score, label } = confiance;
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border text-emerald-600 bg-emerald-50 border-emerald-200">
        <Database className="w-2.5 h-2.5" />📊 {label}
      </span>
    );
  }
  const color = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
    : score >= 60 ? 'text-blue-600 bg-blue-50 border-blue-200'
    : score >= 45 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
      <Database className="w-2.5 h-2.5" />{score}% — {label}
    </span>
  );
};

// ── Panneau sources RAG ───────────────────────────────────────
const SourcesPanel = ({ sources }) => {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {sources.length} source{sources.length > 1 ? 's' : ''} RAG
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {sources.map((s, i) => (
            <div key={i} className="text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 flex justify-between">
              <span className="capitalize flex-1 flex items-center gap-2">
                {s.source?.replace('_', ' ')}
                {s.warning && <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-1 py-0.5 rounded">⚠️ &gt; 1 an</span>}
              </span>
              <span className={`font-mono ${s.score >= 0.6 ? 'text-emerald-600' : s.score >= 0.45 ? 'text-amber-600' : 'text-red-600'}`}>
                {Math.round(s.score * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Widget principal ──────────────────────────────────────────
export default function ChatbotWidget() {
  const [isOpen, setIsOpen]     = useState(false);
  const [messages, setMessages] = useState([{
    text: "Bonjour ! Je suis l'**Assistant IA** de la Banque Populaire.\n\nJe peux vous aider sur :\n- L'état du parc matériel\n- Les alertes et pannes\n- Les affectations et demandes\n\nComment puis-je vous aider ?",
    isBot: true
  }]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [size, setSize]         = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [liveCtx, setLiveCtx]  = useState(null); // contexte live

  const resizing    = useRef(false);
  const startPos    = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const messagesEnd = useRef(null);
  const location    = useLocation();
  const navigate    = useNavigate();

  const suggestions = PAGE_SUGGESTIONS[location.pathname] || DEFAULT_SUGGESTIONS;

  // Auto-scroll
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  // Charger le contexte live dès l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const [statsRes, alertesRes] = await Promise.allSettled([
          dashboardService.getStats(),
          equipmentService.getAlertes(),
        ]);
        const d = statsRes.status === 'fulfilled' ? statsRes.value.data : null;
        if (d) {
          setLiveCtx({
            total_equipements:      d.equipements?.total       || 0,
            disponibles:            d.equipements?.disponibles || 0,
            affectes:               d.equipements?.affectes    || 0,
            en_panne:               d.equipements?.enPanne     || 0,
            en_maintenance:         d.equipements?.maintenance || 0,
            demandes_en_attente:    d.alertes?.demandesEnAttente || 0,
            garanties_expirees:     d.alertes?.garantiesExpirees || 0,
            alertes_actives:        alertesRes.status === 'fulfilled' ? alertesRes.value.data.length : 0,
            page_courante:          location.pathname,
          });
        }
      } catch { /* silencieux */ }
    };
    load();
  }, [isOpen]);

  // Polling statut indexation
  useEffect(() => {
    let interval;
    if (isOpen) {
      const check = async () => {
        try { const { data } = await chatbotService.indexingStatus(); setIsIndexing(data.is_indexing); } catch { /**/ }
      };
      check();
      interval = setInterval(check, 5000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  // Toggle taille
  const toggleSize = () => {
    setSize(expanded ? { w: DEFAULT_W, h: DEFAULT_H } : { w: EXPANDED_W, h: EXPANDED_H });
    setExpanded(!expanded);
  };

  // Resize drag
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    resizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    const onMove = (ev) => {
      if (!resizing.current) return;
      const maxH = Math.floor(window.innerHeight * 0.88);
      setSize({
        w: Math.max(MIN_W, Math.min(MAX_W, startPos.current.w + (startPos.current.x - ev.clientX))),
        h: Math.max(MIN_H, Math.min(maxH, startPos.current.h + (startPos.current.y - ev.clientY))),
      });
    };
    const onUp = () => { resizing.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size]);

  // Feedback
  const handleFeedback = async (idx, isUseful) => {
    const msg = messages[idx];
    if (!msg || msg.feedbackSent) return;
    try { await chatbotService.feedback({ question: msg.question || '', reponse_utile: isUseful, commentaire: isUseful ? 'Utile' : 'Pas utile' }); } catch { /**/ }
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, feedbackSent: true, feedbackValue: isUseful } : m));
  };

  const handleShare = (text) => navigate('/messagerie', { state: { prefill: `Informations du Chatbot IA:\n\n${text}` } });

  // Envoi du message avec contexte live
  const handleSend = async (val) => {
    const textToSend = typeof val === 'string' ? val : input;
    if (!textToSend.trim() || loading) return;
    setMessages(prev => [...prev, { text: textToSend, isBot: false }]);
    setInput('');
    setLoading(true);
    try {
      const response = await chatbotService.ask(textToSend, liveCtx);
      const d = response.data;
      setMessages(prev => [...prev, {
        text:      d.reponse || 'Pas de réponse disponible.',
        isBot:     true,
        confiance: d.confiance || null,
        sources:   d.sources  || [],
        ia:        d.ia_utilisee || null,
        question:  textToSend,
      }]);
    } catch (e) {
      const err = e.response?.data?.error || e.message || 'Difficulté technique';
      setMessages(prev => [...prev, { text: `⚠️ **Erreur :** ${err}`, isBot: true }]);
    } finally {
      setLoading(false);
    }
  };

  if (location.pathname.startsWith('/messagerie')) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div style={{ width: size.w, height: size.h }}
          className="bg-white shadow-[0_10px_50px_rgba(0,0,0,0.18)] rounded-3xl flex flex-col border border-slate-100 overflow-hidden animate-slide-up relative">

          {/* Resize handle */}
          <div onMouseDown={onResizeStart} className="absolute top-0 left-0 w-5 h-5 cursor-nw-resize z-20 group">
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full mt-1.5 ml-1.5 group-hover:bg-slate-400 transition-colors" />
          </div>

          {/* Header */}
          <div className="p-4 bg-primary text-white flex justify-between items-center shadow-md shadow-primary/10 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="currentColor" /></pattern></defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-base block leading-tight">Assistant IA BP</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span className="text-[11px] text-white/80 font-medium">
                    {liveCtx ? `Parc : ${liveCtx.total_equipements} équipements` : 'En ligne'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 relative z-10">
              <button onClick={toggleSize} className="p-2 hover:bg-white/20 rounded-xl transition-colors" title={expanded ? 'Réduire' : 'Agrandir'}>
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <Minus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contexte live pill */}
          {liveCtx && (
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3 overflow-x-auto scrollbar-hide shrink-0">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap">Live :</span>
              {[
                { label: 'Disponibles', val: liveCtx.disponibles,         color: 'text-emerald-600 bg-emerald-100' },
                { label: 'Affectés',    val: liveCtx.affectes,            color: 'text-blue-600 bg-blue-100' },
                { label: 'En Panne',    val: liveCtx.en_panne,            color: 'text-red-600 bg-red-100' },
                { label: 'Alertes',     val: liveCtx.alertes_actives,     color: 'text-amber-600 bg-amber-100' },
              ].map(p => (
                <span key={p.label} className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${p.color}`}>
                  {p.val} {p.label}
                </span>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 custom-scrollbar bg-slate-50/50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex items-end gap-2.5 ${msg.isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${msg.isBot ? 'bg-white border-slate-100' : 'bg-primary border-primary/20'}`}>
                  {msg.isBot ? <Bot className="w-4 h-4 text-primary" /> : <User className="w-4 h-4 text-white" />}
                </div>
                <div className={`max-w-[82%] space-y-1.5 ${msg.isBot ? 'text-left' : 'text-right'}`}>
                  <div className={`p-4 rounded-2xl shadow-sm ${msg.isBot ? 'bg-white border border-slate-100 rounded-bl-none' : 'bg-primary text-white rounded-br-none shadow-primary/10'}`}>
                    {msg.isBot ? renderMarkdown(msg.text) : <p className="text-[13.5px] leading-relaxed">{msg.text}</p>}
                  </div>
                  {msg.isBot && (
                    <div className="flex flex-col gap-1.5 px-1">
                      {msg.confiance && (
                        <div className="flex flex-wrap items-center gap-2">
                          <ConfidenceBadge confiance={msg.confiance} />
                          {msg.ia && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-100">
                              <Cpu className="w-2.5 h-2.5" />
                              {msg.ia.includes('groq') ? 'LLaMA 3.3' : msg.ia.includes('gemini') ? 'Gemini' : msg.ia}
                            </span>
                          )}
                          {!msg.feedbackSent ? (
                            <div className="flex items-center gap-1 ml-auto">
                              <button onClick={() => handleShare(msg.text)} className="p-1 px-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-all" title="Partager"><Share2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleFeedback(idx, true)} className="p-1 px-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 transition-all"><ThumbsUp className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleFeedback(idx, false)} className="p-1 px-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"><ThumbsDown className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <span className={`text-[10px] font-bold ml-auto px-2 py-0.5 rounded-full ${msg.feedbackValue ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                              {msg.feedbackValue ? '✓ Utile' : '✓ Noté'}
                            </span>
                          )}
                        </div>
                      )}
                      <SourcesPanel sources={msg.sources} />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(loading || isIndexing) && (
              <div className="flex items-end gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-bl-none flex gap-1.5 items-center shadow-sm">
                  {isIndexing ? (
                    <><RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" /><span className="text-[11px] text-slate-500 font-medium italic">Réindexation en cours...</span></>
                  ) : (
                    <div className="flex gap-1">
                      {[0, 0.15, 0.3].map((d, i) => (
                        <span key={i} className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {/* Suggestions dynamiques */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 bg-white border-t border-slate-50">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => handleSend(s)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm">
                {s}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-slate-100 flex gap-2.5 shrink-0 items-center">
            <div className="flex-1 relative">
              <input
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-10 py-3 text-sm text-slate-800 outline-none focus:border-primary/40 focus:bg-white transition-all placeholder:text-slate-400 font-medium shadow-inner"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Posez votre question..."
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <button
              className="bg-primary hover:bg-accent text-white w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-40"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="relative w-16 h-16 bg-primary text-white rounded-2xl shadow-[0_15px_30px_-5px_rgba(245,130,32,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-white border-4 border-primary rounded-full" />
          <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
}
