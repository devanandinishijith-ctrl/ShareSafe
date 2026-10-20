import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { RecipientAccessPage } from './pages/RecipientAccessPage';
import { ShieldCheck } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Extract share token if URL is /share/:token or ?token=...
  const evaluateRoute = () => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const queryToken = searchParams.get('token');

    if (queryToken) {
      setShareToken(queryToken);
      setCurrentPath('/share/' + queryToken);
      return;
    }

    if (path.startsWith('/share/')) {
      const token = path.replace('/share/', '').trim();
      if (token) {
        setShareToken(token);
        setCurrentPath(path);
        return;
      }
    }

    setShareToken(null);
    setCurrentPath(path);
  };

  useEffect(() => {
    evaluateRoute();

    const handlePopState = () => {
      evaluateRoute();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToRecipientPage = (token: string) => {
    const newPath = `/share/${token}`;
    window.history.pushState({}, '', newPath);
    setShareToken(token);
    setCurrentPath(newPath);
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setShareToken(null);
    setCurrentPath('/');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-cyan flex items-center justify-center text-white shadow-xl shadow-brand-blue/20 animate-pulse">
          <ShieldCheck className="w-8 h-8 stroke-[2.2]" />
        </div>
        <div className="w-6 h-6 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Initializing ShareSafe...
        </p>
      </div>
    );
  }

  // 1. Recipient Access Page (Public route for share link recipients)
  if (shareToken) {
    return (
      <RecipientAccessPage
        shareToken={shareToken}
        onNavigateHome={navigateToHome}
      />
    );
  }

  // 2. Unauthenticated -> Auth Page (Sign In / Sign Up)
  if (!user) {
    return <AuthPage />;
  }

  // 3. Authenticated -> SaaS Dashboard
  return <DashboardPage onOpenRecipientPage={navigateToRecipientPage} />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
