import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { CookieConsentBanner } from './components/common/CookieConsentBanner';
import { UpdateBanner } from './components/UpdateBanner';
import { FeedbackWidget } from './components/FeedbackWidget';
import { DashboardShell } from './pages/DashboardShell';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { AcademicProfilePage } from './pages/academic/AcademicProfilePage';
import { AcademicStructurePage } from './pages/structure/AcademicStructurePage';
import { AcademicDocumentsPage } from './pages/documents/AcademicDocumentsPage';
import { PersonalVaultPage } from './pages/documents/PersonalVaultPage';
import { SearchPage } from './pages/search/SearchPage';
import { TimetablePage } from './pages/timetable/TimetablePage';
import { PrivacySettingsPage } from './pages/rgpd/PrivacySettingsPage';
import { getHealthCheck } from './services/healthService';
import { HealthCheckData } from './types/api';
import { useAuth } from './context/useAuth';
import { TOUR_DONE_KEY } from './components/onboarding/tourConstants';

// Lazy-loaded pages
const OnboardingTour = lazy(() => import('./components/onboarding/OnboardingTour'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const MyDataPage = lazy(() => import('./pages/MyDataPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const BetaLandingPage = lazy(() => import('./pages/BetaLandingPage').then(m => ({ default: m.BetaLandingPage })));
const BetaDashboardPage = lazy(() => import('./pages/admin/BetaDashboardPage').then(m => ({ default: m.BetaDashboardPage })));

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

 const [activeTab, setActiveTab] = useState<string>('landing');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);

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
            onNavigateForgotPassword={() => {}}
            onSuccessLogin={() => handleTabChange('dashboard')}
          />
        );

      case 'login':
        return (
          <LoginPage
            onNavigateRegister={() => handleTabChange('register')}
            onNavigateForgotPassword={() => {}}
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

      case 'timetable':
        return (
          <TimetablePage
            onNavigateToDocuments={() => handleTabChange('academic-documents')}
          />
        );

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
      <div className="main-layout">
        <Header
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
      `}</style>
    </div>
  );
};

export default App;
