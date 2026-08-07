import React, { useState, useEffect } from 'react';
import { HealthCheckData } from '../types/api';
import { DashboardStats, QuickAccessItem } from '../types/search';
import { DocumentItem } from '../types/document';
import { HealthCard } from '../components/common/HealthCard';
import { ModulePlaceholderCard } from '../components/common/ModulePlaceholderCard';
import { DashboardStatsWidgets } from '../components/dashboard/DashboardStatsWidgets';
import { RecentlyViewedWidget } from '../components/dashboard/RecentlyViewedWidget';
import { TodaySessionsWidget } from '../components/dashboard/TodaySessionsWidget';
import { UnclassifiedCounterWidget } from '../components/dashboard/UnclassifiedCounterWidget';
import { FilePreviewModal } from '../components/documents/FilePreviewModal';
import { useAuth } from '../context/useAuth';
import { useAcademic } from '../context/useAcademic';
import * as searchService from '../services/searchService';
import { 
  ShieldCheck, 
  Sparkles, 
  User, 
  LogIn, 
  ArrowRight, 
  GraduationCap, 
  Layers, 
  Calendar,
  FileText,
  Search
} from 'lucide-react';

interface DashboardShellProps {
  healthData: HealthCheckData | null;
  loadingHealth: boolean;
  errorHealth: string | null;
  onRefreshHealth: () => void;
  onNavigateLogin?: () => void;
  onNavigateAcademicProfile?: () => void;
  onNavigateAcademicStructure?: () => void;
  onNavigateAcademicDocuments?: () => void;
  onNavigatePersonalVault?: () => void;
  onNavigateSearch?: () => void;
  onNavigateTimetable?: () => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  healthData,
  loadingHealth,
  errorHealth,
  onRefreshHealth,
  onNavigateLogin,
  onNavigateAcademicProfile,
  onNavigateAcademicDocuments,
  onNavigatePersonalVault,
  onNavigateSearch,
  onNavigateTimetable,
}) => {
  const { user, isAuthenticated } = useAuth();
  const { profile, hasConfiguredProfile } = useAcademic();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quickAccessList, setQuickAccessList] = useState<QuickAccessItem[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([
        searchService.getDashboardStats(),
        searchService.getQuickAccess(),
      ]).then(([statsRes, quickRes]) => {
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        if (quickRes.success && quickRes.data) setQuickAccessList(quickRes.data);
      });
    }
  }, [isAuthenticated]);

  return (
    <div className="dashboard-shell">
      {/* Hero Banner */}
      <div className="hero-banner glass-card">
        <div className="hero-content">
          {isAuthenticated && user ? (
            <>
              <div className="hero-badge auth-badge">
                <User size={14} />
                <span>Session Étudiante Active</span>
              </div>
              <h1>Bienvenue, {user.fullName} 👋</h1>

              {hasConfiguredProfile && profile ? (
                <div className="academic-context-box">
                  <div className="context-pill">
                    <GraduationCap size={16} className="text-indigo" />
                    <span>{profile.university}</span>
                  </div>
                  <span className="bullet">•</span>
                  <div className="context-pill">
                    <Layers size={16} className="text-purple" />
                    <span>{profile.program} ({profile.level})</span>
                  </div>
                  {profile.academicYear && (
                    <>
                      <span className="bullet">•</span>
                      <div className="context-pill">
                        <Calendar size={16} className="text-cyan" />
                        <span>
                          {profile.academicYear.yearLabel} —{' '}
                          {profile.academicYear.semesters.filter((s) => s.isActive).map((s) => `S${s.number}`).join(' & ')}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="hero-description">
                  Votre compte est connecté. Configurez votre <strong>profil universitaire</strong> pour débloquer votre coffre-fort et vos cours.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="hero-badge">
                <Sparkles size={14} />
                <span>StudyVault — Plateforme Académique</span>
              </div>
              <h1>Organisez vos cours universitaires sans effort</h1>
              <p className="hero-description">
                Connectez-vous pour débloquer votre bibliothèque numérique, votre visionneuse avancée et votre coffre-fort confidentiel.
              </p>
            </>
          )}
        </div>

        <div className="hero-actions">
          {isAuthenticated && hasConfiguredProfile && onNavigateSearch && (
            <button className="hero-cta-btn" onClick={onNavigateSearch}>
              <Search size={18} />
              <span>Rechercher un document</span>
              <ArrowRight size={16} />
            </button>
          )}

          {isAuthenticated && !hasConfiguredProfile && onNavigateAcademicProfile && (
            <button className="hero-cta-btn" onClick={onNavigateAcademicProfile}>
              <GraduationCap size={18} />
              <span>Configurer mon parcours</span>
              <ArrowRight size={16} />
            </button>
          )}

          {!isAuthenticated && onNavigateLogin && (
            <button className="hero-cta-btn" onClick={onNavigateLogin}>
              <LogIn size={18} />
              <span>Se Connecter / S'inscrire</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Stats & Quick Access Widgets for Authenticated Users */}
      {isAuthenticated && (
        <>
          <UnclassifiedCounterWidget
            onNavigateToDocuments={() => onNavigateAcademicDocuments && onNavigateAcademicDocuments()}
          />

          <TodaySessionsWidget
            onNavigateToTimetable={() => onNavigateTimetable && onNavigateTimetable()}
            onNavigateToDocuments={() => onNavigateAcademicDocuments && onNavigateAcademicDocuments()}
          />

          <DashboardStatsWidgets
            stats={stats}
            quickAccessList={quickAccessList}
            onSelectDocument={(doc) => setPreviewDoc(doc)}
            onNavigateSearch={() => onNavigateSearch && onNavigateSearch()}
          />

          <RecentlyViewedWidget onSelectDocument={(doc) => setPreviewDoc(doc)} />
        </>
      )}

      {/* Quick Action Cards */}
      {isAuthenticated && (
        <div className="quick-actions-row">
          <div className="glass-card action-card" onClick={onNavigateTimetable}>
            <Calendar className="text-indigo" size={28} />
            <div>
              <h4>Emploi du Temps Académique</h4>
              <p>Planning hebdomadaire interactif connecté à vos cours & TD.</p>
            </div>
            <ArrowRight className="action-arrow" size={18} />
          </div>

          <div className="glass-card action-card" onClick={onNavigateAcademicDocuments}>
            <FileText className="text-indigo" size={28} />
            <div>
              <h4>Bibliothèque de Cours</h4>
              <p>Importez, prévisualisez et téléchargez vos cours, TD, TP et annales.</p>
            </div>
            <ArrowRight className="action-arrow" size={18} />
          </div>

          <div className="glass-card action-card" onClick={onNavigatePersonalVault}>
            <ShieldCheck className="text-cyan" size={28} />
            <div>
              <h4>Coffre-fort Personnel</h4>
              <p>Espace confidentiel dédié pour vos CV, lettres, attestations et diplômes.</p>
            </div>
            <ArrowRight className="action-arrow" size={18} />
          </div>
        </div>
      )}

      {/* Health Status Diagnostic Component */}
      <HealthCard
        healthData={healthData}
        loading={loadingHealth}
        error={errorHealth}
        onRefresh={onRefreshHealth}
      />

      {/* Modular Architecture Placeholder */}
      <ModulePlaceholderCard modules={healthData?.modules} />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      <style>{`
        .dashboard-shell {
          display: flex;
          flex-direction: column;
        }

        .hero-banner {
          padding: var(--space-xl);
          margin-bottom: var(--space-xl);
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%);
          border-color: rgba(99, 102, 241, 0.3);
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        @media (min-width: 768px) {
          .hero-banner {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-full);
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .hero-badge.auth-badge {
          background: var(--status-success-bg);
          color: var(--status-success);
        }

        .hero-content h1 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #ffffff 0%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-description {
          color: var(--text-secondary);
          max-width: 650px;
          font-size: 0.925rem;
        }

        .academic-context-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }

        .context-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .bullet {
          color: var(--text-muted);
        }

        .hero-cta-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 1.35rem;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.9rem;
          box-shadow: var(--shadow-glow);
          white-space: nowrap;
          transition: transform var(--transition-fast);
        }

        .hero-cta-btn:hover {
          transform: translateY(-2px);
        }

        .quick-actions-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-bottom: var(--space-xl);
          margin-top: 1.25rem;
        }

        @media (min-width: 768px) {
          .quick-actions-row {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }

        .action-card {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: border-color var(--transition-fast), transform var(--transition-fast);
        }

        .action-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .action-card h4 {
          font-size: 0.95rem;
          margin-bottom: 0.2rem;
        }

        .action-card p {
          font-size: 0.775rem;
          color: var(--text-muted);
        }

        .action-arrow {
          margin-left: auto;
          color: var(--text-muted);
        }

        .text-indigo { color: var(--primary); }
        .text-purple { color: var(--accent-purple); }
        .text-cyan { color: var(--accent-cyan); }
      `}</style>
    </div>
  );
};
