import React, { useState, useEffect, useCallback } from 'react';
import { DocumentItem, PersonalFolderItem } from '../../types/document';
import * as docService from '../../services/documentService';
import { FileUploadZone } from '../../components/documents/FileUploadZone';
import { FileCard } from '../../components/documents/FileCard';
import { FilePreviewModal } from '../../components/documents/FilePreviewModal';
import { QuotaIndicator } from '../../components/documents/QuotaIndicator';
import { DeleteConfirmModal } from '../../components/structure/DeleteConfirmModal';
import { 
  ShieldCheck, 
  FolderPlus, 
  FileText, 
  Award, 
  GraduationCap, 
  Sparkles, 
  Search, 
  Folder,
  Plus
} from 'lucide-react';
import { PersonalFolderInput } from '../../types/validators';

const CATEGORIES = [
  { type: 'cv', label: 'Curriculum Vitae (CV)', icon: FileText },
  { type: 'lettre', label: 'Lettres de Motivation', icon: Sparkles },
  { type: 'attestation', label: 'Attestations & Certificats', icon: ShieldCheck },
  { type: 'diplome', label: 'Diplômes & Titres', icon: GraduationCap },
  { type: 'releve', label: 'Relevés de Notes Officiels', icon: Award },
  { type: 'autre', label: 'Autres Documents Personnels', icon: Folder },
] as const;

export const PersonalVaultPage: React.FC = () => {
  const [folders, setFolders] = useState<PersonalFolderItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PersonalFolderInput['categoryType']>('cv');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);

  const loadVaultData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersRes, docsRes] = await Promise.all([
        docService.getPersonalFolders(),
        docService.getDocuments({
          personalFolderId: selectedFolderId || undefined,
          isPersonalVault: true,
          search: searchQuery || undefined,
        }),
      ]);

      if (foldersRes.success && Array.isArray(foldersRes.data)) {
        setFolders(foldersRes.data);

        // Auto-create default category folder if empty
        if (foldersRes.data.length === 0) {
          const created = await docService.createPersonalFolder({
            categoryType: 'cv',
            name: 'Mon CV & Profil',
          });
          if (created.success && created.data) {
            setSelectedFolderId(created.data.id);
          }
        } else if (!selectedFolderId) {
          setSelectedFolderId(foldersRes.data[0].id);
        }
      } else {
        setFolders([]);
      }

      if (docsRes.success && Array.isArray(docsRes.data)) {
        setDocuments(docsRes.data);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error loading personal vault:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, searchQuery]);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const res = await docService.createPersonalFolder({
      categoryType: selectedCategory,
      name: newFolderName.trim(),
    });

    if (res.success && res.data) {
      setNewFolderName('');
      setShowFolderModal(false);
      setSelectedFolderId(res.data.id);
      loadVaultData();
    }
  };

  const handleSoftDelete = async () => {
    if (deleteTarget) {
      await docService.softDeleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      loadVaultData();
    }
  };

  return (
    <div className="personal-vault-page">
      {/* Header Banner */}
      <div className="glass-card page-header vault-header">
        <div className="header-info">
          <div className="header-badge vault-badge">
            <ShieldCheck size={14} />
            <span>Espace Confidentiel (Coffre-fort)</span>
          </div>
          <h2>Coffre-fort Personnel</h2>
          <p>
            Stockez vos documents administratifs personnels en toute sécurité (CV, lettres, attestations, diplômes).
          </p>
        </div>

        <QuotaIndicator />
      </div>

      <div className="vault-main-layout">
        {/* Sidebar Category Selector */}
        <div className="glass-card vault-sidebar">
          <div className="sidebar-header">
            <h4>Catégories Personnelles</h4>
            <button className="add-folder-btn" onClick={() => setShowFolderModal(true)} title="Créer un dossier">
              <Plus size={14} />
              <span>Nouveau</span>
            </button>
          </div>

          <div className="categories-list">
            {loading ? (
              <p className="vault-empty-folders">Chargement des dossiers…</p>
            ) : folders.length === 0 ? (
              <p className="vault-empty-folders">Aucun dossier personnel pour le moment.</p>
            ) : (
              folders.map((folder) => {
              const catConfig = CATEGORIES.find((c) => c.type === folder.categoryType) || CATEGORIES[5];
              const IconComp = catConfig.icon;

              return (
                <button
                  key={folder.id}
                  className={`category-btn ${selectedFolderId === folder.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedFolderId(folder.id);
                    setSelectedCategory(folder.categoryType as PersonalFolderInput['categoryType']);
                  }}
                >
                  <IconComp size={16} className="text-cyan" />
                  <span className="folder-name">{folder.name}</span>
                  <span className="count-pill">{folder.documentCount || 0}</span>
                </button>
              );
            }))}
          </div>
        </div>

        {/* Workspace Documents */}
        <div className="vault-workspace">
          {/* Upload Zone */}
          <FileUploadZone
            personalFolderId={selectedFolderId || undefined}
            onUploadSuccess={() => loadVaultData()}
            defaultDocType="autre"
          />

          {/* Search Bar */}
          <div className="filter-bar glass-card">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Rechercher un document personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Grid of Documents */}
          {loading ? (
            <div className="glass-card empty-card">
              <p className="vault-loading-text">Chargement du coffre-fort…</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="documents-grid">
              {documents.map((doc) => (
                <FileCard
                  key={doc.id}
                  document={doc}
                  onPreview={(d) => setPreviewDoc(d)}
                  onDelete={(d) => setDeleteTarget(d)}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card empty-card">
              <FolderPlus size={40} className="text-cyan" />
              <h3>Aucun document dans ce dossier</h3>
              <p>Glissez-déposez vos fichiers personnels (PDF, JPG, PNG) dans la zone ci-dessus.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal New Personal Folder */}
      {showFolderModal && (
        <div className="modal-backdrop">
          <div className="glass-card modal-card">
            <h3>Nouveau Dossier Personnel</h3>
            <form onSubmit={handleCreateFolder} className="folder-form">
              <div className="form-group">
                <label>Nom du dossier *</label>
                <input
                  type="text"
                  placeholder="ex: CV 2026 - Stage de fin d'études"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Catégorie *</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as PersonalFolderInput['categoryType'])}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.type} value={c.type}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowFolderModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  Créer le dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleSoftDelete}
          title={deleteTarget.originalName}
          itemName={deleteTarget.originalName}
          itemType="Matière"
        />
      )}

      <style>{`
        .personal-vault-page {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .vault-header {
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%);
          border-color: rgba(6, 182, 212, 0.3);
        }

        .page-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .vault-badge {
          background: rgba(6, 182, 212, 0.15);
          color: var(--accent-cyan);
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-full);
          font-size: 0.725rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
        }

        .header-info h2 { font-size: 1.4rem; margin-bottom: 0.2rem; }
        .header-info p { font-size: 0.85rem; color: var(--text-muted); }

        .vault-main-layout {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 850px) {
          .vault-main-layout { grid-template-columns: 1fr; }
        }

        .vault-sidebar {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-header h4 {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .add-folder-btn {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm);
          background: rgba(6, 182, 212, 0.15);
          color: var(--accent-cyan);
          font-size: 0.725rem;
          font-weight: 600;
        }

        .categories-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .category-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.65rem;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 500;
          width: 100%;
          text-align: left;
        }

        .category-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .category-btn.active {
          background: rgba(6, 182, 212, 0.15);
          color: var(--accent-cyan);
          font-weight: 600;
        }

        .folder-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .count-pill {
          padding: 0.1rem 0.4rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.08);
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .vault-workspace {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .filter-bar { padding: 0.65rem 0.875rem; }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon { position: absolute; left: 0.75rem; color: var(--text-muted); }

        .search-box input {
          width: 100%;
          padding: 0.45rem 0.75rem 0.45rem 2.25rem;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.825rem;
          outline: none;
        }

        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }

        .empty-card {
          padding: 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .vault-empty-folders {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          padding: 0.5rem 0;
        }

        .vault-loading-text {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
          display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem;
        }
        .modal-card { width: 100%; max-width: 400px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .folder-form { display: flex; flex-direction: column; gap: 1rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
        .form-group input, .form-group select {
          width: 100%; padding: 0.65rem; background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color); border-radius: var(--radius-md);
          color: var(--text-primary); font-size: 0.875rem; outline: none;
        }
        .modal-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }
        .btn-cancel { padding: 0.5rem 0.85rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); font-size: 0.825rem; }
        .btn-submit { padding: 0.5rem 1rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-size: 0.825rem; font-weight: 600; }

        .text-cyan { color: var(--accent-cyan); }
      `}</style>
    </div>
  );
};
