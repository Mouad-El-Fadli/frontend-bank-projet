import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ChatbotWidget from '../components/features/ChatbotWidget';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { hasRole } = useAuth();

  // On affiche le chatbot pour tout le monde car le Manager IT en a aussi besoin
  const showChatbot = true;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300 flex">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}
      >
        <TopBar collapsed={collapsed} onMenuToggle={() => setCollapsed(!collapsed)} />
        <main className="flex-1 p-6 overflow-auto">
          {/* ErrorBoundary — évite les pages blanches silencieuses */}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      {showChatbot && <ChatbotWidget />}
    </div>
  );
}
