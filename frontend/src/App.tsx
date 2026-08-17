import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { UpdateBanner } from './components/UpdateBanner';
import { DebugOcrPage } from './pages/DebugOcrPage';
import { FeedbackWidget } from './components/FeedbackWidget';
import { DashboardShell } from './pages/DashboardShell';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AcademicProfilePage } from './pages/academic/AcademicProfilePage';
import { AcademicStructurePage } from './pages/structure/AcademicStructurePage';
import { AcademicDocumentsPage } from './pages/documents/AcademicDocumentsPage';
import { LibraryPage } from './pages/documents/LibraryPage';
import { PersonalVaultPage } from './pages/documents/PersonalVaultPage';
import { SearchPage } from './pages/search/SearchPage';
import { TimetablePage } from './pages/timetable/TimetablePage';
import { GradesPage } from './pages/grades/GradesPage';
import { PrivacySettingsPage } from './pages/rgpd/PrivacySettingsPage';
import { getHealthCheck } from './services/healthService';
import { HealthCheckData } from './types/api';
import { useAuth } from './context/useAuth';
import { TOUR_DONE_KEY } from './components/onboarding/tourConstants';

import './i18n/config';

// Lazy-loaded pages
const OnboardingTour = lazy(() => import('./components/onboarding/OnboardingTour'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const MyDataPage = lazy(() => import('./pages/MyDataPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const UpdatePage = lazy(() => import('./pages/UpdatePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const BetaLandingPage = lazy(() => import('./pages/BetaLandingPage').then(m => ({ default: m.BetaLandingPage })));
const BetaDashboardPage = lazy(() => import('./pages/admin/BetaDashboardPage').then(m => ({ default: m.BetaDashboardPage })));

export const App: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('landing');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 1024 : false;
  });
  const [showTour, setShowTour] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string>('');
  const [showDesktopUpdateBanner, setShowDesktopUpdateBanner] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.pathname === '/debug-ocr' || window.location.hash === '#debug-ocr')) {
      setActiveTab('debug-ocr');
    }
  }, []);

  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [errorHealth, setErrorHealth] = useState<string | null>(null);

  const loadHealthStatus = async () => {
    setLoadingHealth(true);
    setErrorHealth(null);
    try {
      const result = await getHealthCheck();
      if (result.success && result.data) {
        setHealthData(result.data);
      } else {
        setErrorHealth(result.error?.message || 'Impossible de joindre le serveur API.');
      }
    } catch (_err) {
      setErrorHealth('Erreur de connexion au serveur backend.');
    } finally {
      setLoadingHealth(false);
    }
  };

  const hasCheckedUpdateRef = useRef(false);

  useEffect(() => {
    if (hasCheckedUpdateRef.current) return;
    hasCheckedUpdateRef.current = true;

    const isTauri = typeof window !== 'undefined' && Boolean(
      (window as any).__TAURI__ ||
      (window as any).__TAURI_IPC__ ||
      (window as any).__TAURI_METADATA__ ||
      window.location.protocol.startsWith('tauri') ||
      window.location.protocol.startsWith('asset')
    );

    if (isTauri) {
      import('@tauri-apps/api/updater')
        .then(({ checkUpdate }) => checkUpdate())
        .then((res) => {
          if (res?.shouldUpdate) {
            setShowDesktopUpdateBanner(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadHealthStatus();
  }, []);

  // Accueil par défaut : page d'accueil si non connecté, dashboard si connecté
  useEffect(() => {
    setActiveTab(isAuthenticated ? 'dashboard' : 'landing');
  }, [isAuthenticated]);

  // Show onboarding tour for new users after login
  useEffect(() => {
    if (isAuthenticated && !localStorage.getItem(TOUR_DONE_KEY)) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="session-loading-screen">
        <div className="session-loading-content">
          <div className="session-loading-spinner" />
          <h2 className="session-loading-title">StudyVault</h2>
          <p className="session-loading-sub">Chargement de la session...</p>
        </div>
        <style>{`
          .session-loading-screen {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: var(--bg-primary, #0f172a);
            color: var(--text-primary, #f8fafc);
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .session-loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
            text-align: center;
          }
          .session-loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(99, 102, 241, 0.2);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: session-spin 1s linear infinite;
          }
          .session-loading-title {
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: -0.025em;
            margin: 0;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .session-loading-sub {
            font-size: 0.9rem;
            color: var(--text-muted, #94a3b8);
            margin: 0;
          }
          @keyframes session-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRestartTour = () => {
    localStorage.removeItem(TOUR_DONE_KEY);
    setShowTour(true);
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardShell
            healthData={healthData}
            loadingHealth={loadingHealth}
            errorHealth={errorHealth}
            onRefreshHealth={loadHealthStatus}
            onNavigateLogin={() => handleTabChange('login')}
            onNavigateAcademicProfile={() => handleTabChange('academic-profile')}
            onNavigateAcademicStructure={() => handleTabChange('academic-structure')}
            onNavigateAcademicDocuments={() => handleTabChange('academic-documents')}
            onNavigatePersonalVault={() => handleTabChange('personal-vault')}
            onNavigateSearch={() => handleTabChange('search')}
            onNavigateTimetable={() => handleTabChange('timetable')}
          />
        );

      case 'landing':
        return (
          <Suspense fallback={<div className="lazy-loading">Chargement...</div>}>
            <BetaLandingPage
              onNavigateLogin={() => handleTabChange('login')}
              onNavigateRegister={() => handleTabChange('register')}
            />
          </Suspense>
        );

      case 'admin-dashboard':
        return (
          <Suspense fallback={<div className="lazy-loading">Chargement du dashboard admin...</div>}>
            <BetaDashboardPage />
          </Suspense>
        );

      case 'search':
        return isAuthenticated ? (
          <SearchPage />
        ) : (
          <LoginPage
            onNavigateRegister={() => handleTabChange('register')}
            onNavigateForgotPassword={() => handleTabChange('forgot-password')}
            onSuccessLogin={() => handleTabChange('dashboard')}
          />
        );

      case 'login':
        return (
          <LoginPage
            onNavigateRegister={() => handleTabChange('register')}
            onNavigateForgotPassword={() => handleTabChange('forgot-password')}
            onSuccessLogin={() => handleTabChange('dashboard')}
          />
        );

      case 'register':
        return (
          <RegisterPage
            onNavigateLogin={() => handleTabChange('login')}
            onSuccessRegister={() => handleTabChange('academic-profile')}
          />
        );

      case 'forgot-password':
        return (
          <ForgotPasswordPage
            onNavigateLogin={() => handleTabChange('login')}
            onNavigateResetPassword={(token) => {
              setResetToken(token);
              handleTabChange('reset-password');
            }}
          />
        );

      case 'reset-password':
        return (
          <ResetPasswordPage
            token={resetToken}
            onNavigateLogin={() => handleTabChange('login')}
          />
        );

      case 'academic-profile':
        return (
          <AcademicProfilePage
            onSuccessSave={() => handleTabChange('academic-structure')}
          />
        );

      case 'academic-structure':
        return (
          <AcademicStructurePage
            onNavigateAcademicProfile={() => handleTabChange('academic-profile')}
          />
        );

      case 'academic-documents':
        return <AcademicDocumentsPage />;

      case 'library':
        return <LibraryPage />;

      case 'timetable':
        return (
          <TimetablePage
            onNavigateToDocuments={() => handleTabChange('academic-documents')}
          />
        );

      case 'grades':
        return <GradesPage />;

      case 'personal-vault':
        return <PersonalVaultPage />;

      case 'privacy-settings':
        return <PrivacySettingsPage />;

      case 'help':
        return (
          <Suspense fallback={<div className="lazy-loading">Chargement du Centre d'Aide…</div>}>
            <HelpCenterPage />
          </Suspense>
        );

      case 'my-data':
        return (
          <Suspense fallback={<div className="lazy-loading">Chargement…</div>}>
            <MyDataPage onNavigatePrivacySettings={() => handleTabChange('privacy-settings')} />
          </Suspense>
        );

      case 'changelog':
        return (
          <Suspense fallback={<div className="lazy-loading">Chargement des nouveautés…</div>}>
            <ChangelogPage />
          </Suspense>
        );

      case 'updates':
        return (
          <Suspense fallback={<div className="lazy-loading">Chargement du Centre de Mises à Jour…</div>}>
            <UpdatePage />
          </Suspense>
        );

      case 'debug-ocr':
        return <DebugOcrPage />;

      case 'settings':
        return (
          <Suspense fallback={<div className="lazy-loading">Chargement des paramètres…</div>}>
            <SettingsPage onNavigate={(tab) => handleTabChange(tab)} />
          </Suspense>
        );

      default:
        return (
          <DashboardShell
            healthData={healthData}
            loadingHealth={loadingHealth}
            errorHealth={errorHealth}
            onRefreshHealth={loadHealthStatus}
          />
        );
    }
  };

  return (
    <div className="app-container">
      {/* Desktop Update Notification Banner */}
      {showDesktopUpdateBanner && (
        <div className="desktop-update-banner">
          <span>🎉 Une nouvelle version de StudyVault est disponible !</span>
          <div className="banner-actions">
            <button className="banner-view-btn" onClick={() => handleTabChange('updates')}>
              Voir la mise à jour →
            </button>
            <button className="banner-close-btn" onClick={() => setShowDesktopUpdateBanner(false)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Web Update Notification Banner */}
      <UpdateBanner />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onRestartTour={handleRestartTour}
      />

      {/* Main Content Area */}
      <div className={`main-layout ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigateLogin={() => handleTabChange('login')}
          onNavigateRegister={() => handleTabChange('register')}
          onNavigateAcademicProfile={() => handleTabChange('academic-profile')}
          onNavigateSearch={(_q) => handleTabChange('search')}
        />

        <main className="content-area">{renderMainContent()}</main>
      </div>

      {/* Cookie Consent Banner */}
      <CookieConsentBanner />

      {/* Floating Beta Feedback Widget */}
      <FeedbackWidget />

      {/* Onboarding Tour — lazy-loaded */}
      {showTour && (
        <Suspense fallback={null}>
          <OnboardingTour onComplete={() => setShowTour(false)} />
        </Suspense>
      )}

      <style>{`
        .lazy-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: var(--text-muted);
          font-size: 0.9rem;
        }
        .desktop-update-banner {
          position: fixed;
          top: 12px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(168, 85, 247, 0.95) 100%);
          color: white;
          border-radius: 30px;
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
          backdrop-filter: blur(8px);
          font-size: 0.88rem;
          font-weight: 500;
          animation: bannerSlideDown 0.3s ease-out;
        }
        .banner-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .banner-view-btn {
          background: rgba(255, 255, 255, 0.25);
          color: white;
          border: none;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .banner-view-btn:hover {
          background: rgba(255, 255, 255, 0.4);
        }
        .banner-close-btn {
          background: transparent;
          color: rgba(255, 255, 255, 0.8);
          border: none;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 0 0.3rem;
        }
        .banner-close-btn:hover {
          color: white;
        }
        @keyframes bannerSlideDown {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default App;
