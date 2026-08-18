import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/useAuth';
import { API_BASE_URL, getClientAccessToken } from '../../services/apiClient';
import { 
  ShieldCheck, 
  Search, 
  UserCheck, 
  UserX, 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  Mail, 
  CheckCircle2, 
  Archive
} from 'lucide-react';

interface ActiveUserItem {
  id: string;
  email: string;
  fullName: string;
  university?: string | null;
  program?: string | null;
  level?: string | null;
  role: string;
  bannedAt: string | null;
  lastLogin: string | null;
  createdAt: string;
}

interface ArchivedUserItem {
  id: string;
  userId: string;
  email: string;
  fullName?: string | null;
  createdAt: string;
  deletedAt: string;
  reason?: string | null;
}

export const AdminUsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'archived'>('users');
  const [users, setUsers] = useState<ActiveUserItem[]>([]);
  const [archivedUsers, setArchivedUsers] = useState<ArchivedUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'banned'>('all');

  // Confirmation Modals State
  const [userToBan, setUserToBan] = useState<ActiveUserItem | null>(null);
  const [userToUnban, setUserToUnban] = useState<ActiveUserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<ActiveUserItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getClientAccessToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      if (activeTab === 'users') {
        const queryParams = new URLSearchParams({
          search: searchQuery,
          status: statusFilter,
        });
        const res = await fetch(`${API_BASE_URL}/admin/users?${queryParams}`, { headers });
        if (res.ok) {
          const json = await res.json();
          const list = json.data?.users || (Array.isArray(json.data) ? json.data : []);
          setUsers(list);
        } else {
          setError('Impossible de charger la liste des utilisateurs.');
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/admin/users/archived`, { headers });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json.data) ? json.data : [];
          setArchivedUsers(list);
        } else {
          setError('Impossible de charger les archives.');
        }
      }
    } catch (_err) {
      setError('Erreur de connexion au serveur admin.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBanUser = async () => {
    if (!userToBan) return;
    setActionLoading(true);
    try {
      const token = getClientAccessToken();
      const res = await fetch(`${API_BASE_URL}/admin/users/${userToBan.id}/ban`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`L'utilisateur ${userToBan.email} a été banni.`);
        setUserToBan(null);
        loadData();
      } else {
        alert(json.error?.message || 'Erreur lors du bannissement.');
      }
    } catch (_e) {
      alert('Erreur réseau lors du bannissement.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!userToUnban) return;
    setActionLoading(true);
    try {
      const token = getClientAccessToken();
      const res = await fetch(`${API_BASE_URL}/admin/users/${userToUnban.id}/unban`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`L'utilisateur ${userToUnban.email} a été réactivé.`);
        setUserToUnban(null);
        loadData();
      } else {
        alert(json.error?.message || 'Erreur lors de la réactivation.');
      }
    } catch (_e) {
      alert('Erreur réseau lors de la réactivation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setActionLoading(true);
    try {
      const token = getClientAccessToken();
      const res = await fetch(`${API_BASE_URL}/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`Le compte ${userToDelete.email} a été supprimé et archivé.`);
        setUserToDelete(null);
        loadData();
      } else {
        alert(json.error?.message || 'Erreur lors de la suppression.');
      }
    } catch (_e) {
      alert('Erreur réseau lors de la suppression.');
    } finally {
      setActionLoading(false);
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="admin-access-denied glass-card">
        <AlertTriangle size={48} className="text-red" />
        <h2>Accès Réservé</h2>
        <p>Cette page d'administration est réservée exclusivement aux comptes administrateurs.</p>
      </div>
    );
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Jamais';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="admin-users-page">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="toast-banner glass-card">
          <CheckCircle2 size={18} className="text-emerald" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header glass-card">
        <div className="header-info">
          <div className="header-icon">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1>{t('admin.usersTitle', 'Administration — Gestion des Utilisateurs')}</h1>
            <p className="subtitle">{t('admin.usersSubtitle', 'Gestion des comptes inscrits, bannissement distant et historique des suppressions.')}</p>
          </div>
        </div>

        <button className="btn-refresh" onClick={loadData} title="Rafraîchir les données">
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UserCheck size={16} />
          <span>{t('admin.tabActiveUsers', 'Comptes Inscrits & Bannis')}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'archived' ? 'active' : ''}`}
          onClick={() => setActiveTab('archived')}
        >
          <Archive size={16} />
          <span>{t('admin.tabArchivedUsers', 'Historique des Supprimés')}</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'users' ? (
        <div className="users-tab-container glass-card">
          {/* Controls Bar: Search & Status Filters */}
          <div className="controls-bar">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={t('admin.searchPlaceholder', 'Rechercher par email ou nom...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="segmented-filters">
              <button
                className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Tous
              </button>
              <button
                className={`filter-chip ${statusFilter === 'active' ? 'active' : ''}`}
                onClick={() => setStatusFilter('active')}
              >
                Actifs
              </button>
              <button
                className={`filter-chip ${statusFilter === 'banned' ? 'active' : ''}`}
                onClick={() => setStatusFilter('banned')}
              >
                Bannis
              </button>
            </div>
          </div>

          {/* Users Data Table */}
          {loading ? (
            <div className="loading-box">Chargement de la liste des utilisateurs...</div>
          ) : error ? (
            <div className="error-box">{error}</div>
          ) : users.length === 0 ? (
            <div className="empty-box">Aucun utilisateur trouvé.</div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Date Inscription</th>
                    <th>Dernier Login</th>
                    <th>Statut</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isBanned = Boolean(u.bannedAt);
                    const isAdmin = u.role === 'admin';

                    return (
                      <tr key={u.id} className={isBanned ? 'row-banned' : ''}>
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">{u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}</div>
                            <div className="user-details">
                              <span className="user-fullname">{u.fullName}</span>
                              <span className="user-email-text">{u.email}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={`role-badge ${isAdmin ? 'admin' : 'user'}`}>
                            {isAdmin ? '🛡️ Admin' : 'Étudiant'}
                          </span>
                        </td>

                        <td>
                          <span className="date-text">{formatDate(u.createdAt)}</span>
                        </td>

                        <td>
                          <span className="date-text">{formatDate(u.lastLogin)}</span>
                        </td>

                        <td>
                          {isBanned ? (
                            <span className="status-badge banned">
                              <UserX size={12} /> Banni
                            </span>
                          ) : (
                            <span className="status-badge active">
                              <CheckCircle2 size={12} /> Actif
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          {!isAdmin && (
                            <div className="actions-cell">
                              {isBanned ? (
                                <button
                                  className="btn-action-unban"
                                  onClick={() => setUserToUnban(u)}
                                  title="Réactiver le compte"
                                >
                                  <UserCheck size={14} />
                                  <span>Débannir</span>
                                </button>
                              ) : (
                                <button
                                  className="btn-action-ban"
                                  onClick={() => setUserToBan(u)}
                                  title="Bannir l'utilisateur à distance"
                                >
                                  <UserX size={14} />
                                  <span>Bannir</span>
                                </button>
                              )}

                              <button
                                className="btn-action-delete"
                                onClick={() => setUserToDelete(u)}
                                title="Supprimer et archiver ce compte"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="archived-tab-container glass-card">
          <h3>Comptes Supprimés & Archivés</h3>
          <p className="subtitle">Historique des comptes supprimés de la plateforme.</p>

          {loading ? (
            <div className="loading-box">Chargement des archives...</div>
          ) : archivedUsers.length === 0 ? (
            <div className="empty-box">Aucun compte dans les archives.</div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Date d'inscription</th>
                    <th>Date de suppression</th>
                    <th>Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedUsers.map((arch) => (
                    <tr key={arch.id}>
                      <td>
                        <div className="user-cell">
                          <Mail size={16} className="text-muted" />
                          <div className="user-details">
                            <span className="user-fullname">{arch.fullName || 'Compte supprimé'}</span>
                            <span className="user-email-text">{arch.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="date-text">{formatDate(arch.createdAt)}</span>
                      </td>

                      <td>
                        <span className="date-text text-amber">{formatDate(arch.deletedAt)}</span>
                      </td>

                      <td>
                        <span className="reason-text">{arch.reason || 'Supprimé par administrateur'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Ban Modal */}
      {userToBan && (
        <div className="modal-backdrop" onClick={() => setUserToBan(null)}>
          <div className="modal-dialog glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header text-red">
              <UserX size={24} />
              <h3>Bannissement à distance</h3>
            </div>
            <p className="modal-body-text">
              Êtes-vous sûr de vouloir bannir l'utilisateur <strong>{userToBan.email}</strong> ?
              <br />
              <br />
              Son accès à l'application sera suspendu immédiatement et tous ses jetons de connexion seront révoqués.
            </p>
            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={() => setUserToBan(null)} disabled={actionLoading}>
                Annuler
              </button>
              <button className="btn-modal-confirm-ban" onClick={handleBanUser} disabled={actionLoading}>
                {actionLoading ? 'Bannissement...' : '🚫 Confirmer le bannissement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Unban Modal */}
      {userToUnban && (
        <div className="modal-backdrop" onClick={() => setUserToUnban(null)}>
          <div className="modal-dialog glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header text-emerald">
              <UserCheck size={24} />
              <h3>Réactivation de compte</h3>
            </div>
            <p className="modal-body-text">
              Réactiver l'accès pour l'utilisateur <strong>{userToUnban.email}</strong> ? L'utilisateur pourra de nouveau se connecter.
            </p>
            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={() => setUserToUnban(null)} disabled={actionLoading}>
                Annuler
              </button>
              <button className="btn-modal-confirm-unban" onClick={handleUnbanUser} disabled={actionLoading}>
                {actionLoading ? 'Réactivation...' : '✅ Réactiver le compte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {userToDelete && (
        <div className="modal-backdrop" onClick={() => setUserToDelete(null)}>
          <div className="modal-dialog glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header text-red">
              <Trash2 size={24} />
              <h3>Supprimer et Archiver le compte</h3>
            </div>
            <p className="modal-body-text">
              Supprimer définitivement le compte de <strong>{userToDelete.email}</strong> ?
              Une sauvegarde d'archivage sera conservée dans les registres d'administration.
            </p>
            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={() => setUserToDelete(null)} disabled={actionLoading}>
                Annuler
              </button>
              <button className="btn-modal-confirm-delete" onClick={handleDeleteUser} disabled={actionLoading}>
                {actionLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-users-page {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .toast-banner {
          position: fixed;
          top: 1.25rem;
          right: 1.5rem;
          z-index: 999;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.75rem 1.25rem;
          background: #0f172a;
          border: 1px solid #10b981;
          color: #ffffff;
          border-radius: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          font-weight: 600;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          font-size: 0.825rem;
          cursor: pointer;
        }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .admin-tabs-bar {
          display: flex;
          gap: 0.75rem;
        }

        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: rgba(15, 23, 42, 0.6);
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn.active {
          background: #6366f1;
          color: #ffffff;
          border-color: #6366f1;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .users-tab-container, .archived-tab-container {
          padding: 1.25rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          min-width: 280px;
        }

        .search-box input {
          width: 100%;
          padding: 0.5rem 0.75rem 0.5rem 2.25rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.3);
          color: var(--text-primary);
          font-size: 0.85rem;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          color: var(--text-muted);
        }

        .segmented-filters {
          display: flex;
          background: rgba(0, 0, 0, 0.4);
          padding: 3px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .filter-chip {
          padding: 0.3rem 0.85rem;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }

        .filter-chip.active {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .admin-table th {
          padding: 0.75rem 1rem;
          color: var(--text-muted);
          font-weight: 700;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .admin-table td {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          vertical-align: middle;
        }

        .row-banned {
          background: rgba(239, 68, 68, 0.06);
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-details {
          display: flex;
          flex-direction: column;
        }

        .user-fullname {
          font-weight: 600;
          color: var(--text-primary);
        }

        .user-email-text {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .role-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
        }
        .role-badge.admin { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
        .role-badge.user { background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 12px;
        }
        .status-badge.active { background: rgba(16, 185, 129, 0.18); color: #34d399; }
        .status-badge.banned { background: rgba(239, 68, 68, 0.2); color: #f87171; }

        .actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
        }

        .btn-action-ban, .btn-action-unban, .btn-action-delete {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          border: none;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-action-ban {
          background: rgba(239, 68, 68, 0.18);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
        }
        .btn-action-ban:hover { background: rgba(239, 68, 68, 0.35); color: #ffffff; }

        .btn-action-unban {
          background: rgba(16, 185, 129, 0.18);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #34d399;
        }
        .btn-action-unban:hover { background: rgba(16, 185, 129, 0.35); color: #ffffff; }

        .btn-action-delete {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
        }
        .btn-action-delete:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-dialog {
          width: 440px;
          padding: 1.5rem;
          border-radius: 14px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .modal-header h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
        }

        .modal-body-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.6rem;
          margin-top: 0.5rem;
        }

        .btn-modal-cancel {
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
        }

        .btn-modal-confirm-ban {
          padding: 0.45rem 1rem;
          border-radius: 8px;
          background: #ef4444;
          color: #ffffff;
          border: none;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-modal-confirm-unban {
          padding: 0.45rem 1rem;
          border-radius: 8px;
          background: #10b981;
          color: #ffffff;
          border: none;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-modal-confirm-delete {
          padding: 0.45rem 1rem;
          border-radius: 8px;
          background: #dc2626;
          color: #ffffff;
          border: none;
          font-weight: 700;
          cursor: pointer;
        }

        .text-red { color: #f87171; }
        .text-emerald { color: #34d399; }
        .text-amber { color: #fbbf24; }
        .text-muted { color: var(--text-muted); }
      `}</style>
    </div>
  );
};
