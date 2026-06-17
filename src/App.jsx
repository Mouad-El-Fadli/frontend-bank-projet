import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import './App.css';

import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <div className="relative min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-300">
            <AppRoutes />
          </div>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
