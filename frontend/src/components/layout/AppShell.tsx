import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { fetchApi } from '../../services/apiClient';
import { HealthCheckData } from '../../types/api';
import { DocumentItem } from '../../types/document';
import { FilePreviewModal } from '../documents/FilePreviewModal';

interface AppShellProps {
  currentView?: string;
  onNavigateView?: (view: string) => void;
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  onNavigateAcademicProfile?: () => void;
  onNavigateAcademicStructure?: () => void;
  onNavigateSearchWithQuery?: (query: string) => void;
  children: (props: {
    healthData: HealthCheckData | null;
    loadingHealth: boolean;
    errorHealth: string | null;
    onRefreshHealth: () => void;
  }) => React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView = 'dashboard',
  onNavigateView,
  onNavigateLogin,
  onNavigateRegister,
  onNavigateAcademicProfile,
  onNavigateSearchWithQuery,
  children,
}) => {
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true);
  const [errorHealth, setErrorHealth] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const fetchHealth = async () => {
    setLoadingHealth(true);
    setErrorHealth(null);
    try {
      const response = await fetchApi<HealthCheckData>('/health');
      if (response.success && response.data) {
        setHealthData(response.data);
      } else {
        setErrorHealth(response.error?.message || 'Erreur lors de la vérification de santé.');
      }
    } catch (err: unknown) {
      setErrorHealth(err instanceof Error ? err.message : 'Erreur de connexion avec le serveur API backend.');
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="app-shell-container">
      <Header
        onNavigateLogin={onNavigateLogin}
        onNavigateRegister={onNavigateRegister}
        onNavigateAcademicProfile={onNavigateAcademicProfile}
        onNavigateSearch={(q) => onNavigateSearchWithQuery && onNavigateSearchWithQuery(q)}
        onSelectDocument={(doc) => setPreviewDoc(doc)}
      />

      <div className="app-main-layout">
        <Sidebar currentView={currentView} onNavigate={onNavigateView} />
        <main className="app-content-area">
          {children({
            healthData,
            loadingHealth,
            errorHealth,
            onRefreshHealth: fetchHealth,
          })}
        </main>
      </div>

      <FilePreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      <style>{`
        .app-shell-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
        }

        .app-main-layout {
          flex: 1;
          display: flex;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: var(--space-xl);
          gap: var(--space-xl);
        }

        .app-content-area {
          flex: 1;
          min-width: 0;
        }

        @media (max-width: 900px) {
          .app-main-layout {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};
