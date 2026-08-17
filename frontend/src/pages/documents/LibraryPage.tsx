import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AcademicStructureTree, ECUE } from '../../types/structure';
import { DocumentItem, DocumentCategoryItem } from '../../types/document';
import * as structureService from '../../services/academicStructureService';
import * as docService from '../../services/documentService';
import * as fileOrganizer from '../../services/fileOrganizer';
import { 
  Library, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Folder, 
  FolderOpen, 
  FileText, 
  File, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Film, 
  Trash2, 
  ExternalLink,
  UploadCloud,
  Info
} from 'lucide-react';

interface LibraryPageProps {
  onNavigateToDocuments?: (subjectId: string) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = () => {
  const { t } = useTranslation();
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUeIds, setExpandedUeIds] = useState<Record<string, boolean>>({});

  // Selected ECUE state
  const [selectedEcue, setSelectedEcue] = useState<{
    ecue: ECUE;
    ueCode?: string | null;
    ueTitle?: string;
    semNumber: number;
  } | null>(null);

  // Categories and documents for selected ECUE
  const [categories, setCategories] = useState<DocumentCategoryItem[]>([]);
  const [ecueDocs, setEcueDocs] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Add category modal / inline form
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Drag over category state (for visual green highlight)
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);

  const loadStructureTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await structureService.getStructureTree();
      if (res.success && res.data) {
        setTree(res.data);
        // Auto-select first ECUE if available
        for (const sem of res.data.semesters) {
          for (const ue of sem.ues) {
            if (ue.ecues && ue.ecues.length > 0) {
              setSelectedEcue({
                ecue: ue.ecues[0],
                ueCode: ue.code,
                ueTitle: ue.title,
                semNumber: sem.number,
              });
              setExpandedUeIds({ [ue.id]: true });
              return;
            }
          }
        }
      }
    } catch (_e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStructureTree();
  }, [loadStructureTree]);

  // Fetch categories and documents whenever selected ECUE changes
  const fetchEcueData = useCallback(async () => {
    if (!selectedEcue) return;
    setLoadingDocs(true);
    try {
      const [catRes, docRes] = await Promise.all([
        docService.getCategories(selectedEcue.ecue.id),
        docService.getDocuments({ ecueId: selectedEcue.ecue.id }),
      ]);

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
        // Sync directory structure in desktop Tauri
        if (fileOrganizer.isTauri) {
          for (const cat of catRes.data) {
            fileOrganizer.ensureCategoryFolder(
              selectedEcue.semNumber,
              selectedEcue.ueCode,
              selectedEcue.ueTitle,
              selectedEcue.ecue.code,
              selectedEcue.ecue.title,
              cat.name
            ).catch(() => {});
          }
        }
      }

      if (docRes.success && docRes.data) {
        setEcueDocs(docRes.data);
      }
    } catch (_e) {
      /* ignore */
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedEcue]);

  useEffect(() => {
    fetchEcueData();
  }, [fetchEcueData]);

  const toggleUe = (ueId: string) => {
    setExpandedUeIds((prev) => ({ ...prev, [ueId]: !prev[ueId] }));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEcue || !newCatName.trim()) return;

    try {
      const res = await docService.createCategory(selectedEcue.ecue.id, newCatName.trim());
      if (res.success) {
        setNewCatName('');
        setShowAddCatModal(false);
        fetchEcueData();

        if (fileOrganizer.isTauri && res.data) {
          fileOrganizer.ensureCategoryFolder(
            selectedEcue.semNumber,
            selectedEcue.ueCode,
            selectedEcue.ueTitle,
            selectedEcue.ecue.code,
            selectedEcue.ecue.title,
            res.data.name
          );
        }
      }
    } catch (_err) {
      /* ignore */
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Supprimer le compartiment "${catName}" ? Ses documents passeront dans "Non classé".`)) return;
    try {
      const res = await docService.deleteCategory(catId);
      if (res.success) {
        fetchEcueData();
      }
    } catch (_err) {
      /* ignore */
    }
  };

  const handleOpenFolder = async (categoryName?: string) => {
    if (!selectedEcue) return;
    await fileOrganizer.openEcueFolder(
      selectedEcue.semNumber,
      selectedEcue.ueCode,
      selectedEcue.ueTitle,
      selectedEcue.ecue.code,
      selectedEcue.ecue.title,
      categoryName
    );
  };

  // Drag Internal Document Card to Category Drop-zone
  const handleDocDragStart = (e: React.DragEvent, doc: DocumentItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'internal-doc', docId: doc.id, oldCatId: doc.categoryId }));
  };

  const handleDragOverCategory = (e: React.DragEvent, catId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverCatId !== catId) {
      setDragOverCatId(catId);
    }
  };

  const handleDragLeaveCategory = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCatId(null);
  };

  const handleDropOnCategory = async (e: React.DragEvent, targetCat: DocumentCategoryItem | null) => {
    e.preventDefault();
    setDragOverCatId(null);
    if (!selectedEcue) return;

    const rawPayload = e.dataTransfer.getData('application/json');
    if (rawPayload) {
      try {
        const payload = JSON.parse(rawPayload);
        if (payload.type === 'internal-doc' && payload.docId) {
          const targetCatId = targetCat ? targetCat.id : null;
          if (payload.oldCatId === targetCatId) return;

          const docToMove = ecueDocs.find((d) => d.id === payload.docId);
          const oldCatObj = categories.find((c) => c.id === payload.oldCatId);

          const res = await docService.moveDocumentCategory(payload.docId, targetCatId);
          if (res.success) {
            fetchEcueData();

            if (fileOrganizer.isTauri && docToMove) {
              fileOrganizer.moveFileBetweenCategories(
                docToMove.originalName,
                selectedEcue.semNumber,
                selectedEcue.ueCode,
                selectedEcue.ueTitle,
                selectedEcue.ecue.code,
                selectedEcue.ecue.title,
                oldCatObj?.name,
                targetCat?.name
              );
            }
          }
          return;
        }
      } catch (_e) {
        /* ignore */
      }
    }

    // Drag & Drop External Files FROM Windows File Explorer
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const formData = new FormData();
      formData.append('ecueId', selectedEcue.ecue.id);
      if (targetCat) formData.append('categoryId', targetCat.id);

      files.forEach((file) => formData.append('files', file));

      try {
        const uploadRes = await docService.uploadFiles(formData);
        if (uploadRes.success) {
          fetchEcueData();

          if (fileOrganizer.isTauri) {
            const paths = files.map((f) => (f as any).path).filter(Boolean);
            if (paths.length > 0) {
              fileOrganizer.copyFilesToCategoryFolder(
                paths,
                selectedEcue.semNumber,
                selectedEcue.ueCode,
                selectedEcue.ueTitle,
                selectedEcue.ecue.code,
                selectedEcue.ecue.title,
                targetCat?.name
              );
            }
          }
        }
      } catch (_err) {
        /* ignore */
      }
    }
  };

  const getDocIcon = (mimeType: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (mimeType.includes('pdf') || ext === 'pdf') return <FileText size={18} className="text-red-400" />;
    if (mimeType.includes('sheet') || ext === 'xlsx' || ext === 'csv') return <FileSpreadsheet size={18} className="text-emerald-400" />;
    if (mimeType.includes('image') || ['png', 'jpg', 'jpeg'].includes(ext)) return <ImageIcon size={18} className="text-purple-400" />;
    if (mimeType.includes('video') || ['mp4', 'avi'].includes(ext)) return <Film size={18} className="text-blue-400" />;
    return <File size={18} className="text-indigo-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="library-page">
      {/* Top Page Header */}
      <div className="page-header glass-card">
        <div className="header-info">
          <div className="header-icon-circle">
            <Library size={24} />
          </div>
          <div>
            <h1>{t('library.title', 'Bibliothèque Académique')}</h1>
            <p className="subtitle">{t('library.subtitle', 'Rangement structuré des cours, TD et sujets par ECUE et compartiments.')}</p>
          </div>
        </div>

        {selectedEcue && (
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => handleOpenFolder()} title="Ouvrir dans l'explorateur OS">
              <FolderOpen size={16} />
              <span>{t('library.openFolderBtn', '📁 Ouvrir le dossier')}</span>
            </button>
            <button className="btn-primary" onClick={() => setShowAddCatModal(true)}>
              <Plus size={16} />
              <span>{t('library.addCategoryBtn', '+ Compartiment')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="library-layout">
        {/* Left Column: Academic Tree Navigation */}
        <div className="library-sidebar glass-card">
          <div className="sidebar-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder={t('library.searchPlaceholder', 'Rechercher une ECUE...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tree-scroll">
            {loading ? (
              <div className="sidebar-loading">Chargement des ECUEs...</div>
            ) : !tree || tree.semesters.length === 0 ? (
              <div className="sidebar-empty">Aucune ECUE configurée.</div>
            ) : (
              tree.semesters.map((sem) => (
                <div key={sem.id} className="semester-group">
                  <div className="sem-header">Semestre {sem.number}</div>

                  {sem.ues.map((ue) => {
                    const isExpanded = expandedUeIds[ue.id] ?? false;
                    const matchingEcues = ue.ecues.filter((ecue) =>
                      !searchQuery.trim() ||
                      ecue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (ecue.code && ecue.code.toLowerCase().includes(searchQuery.toLowerCase()))
                    );

                    if (searchQuery.trim() && matchingEcues.length === 0) return null;

                    return (
                      <div key={ue.id} className="ue-group">
                        <div className="ue-header" onClick={() => toggleUe(ue.id)}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span className="ue-code-badge">{ue.code || 'UE'}</span>
                          <span className="ue-title">{ue.title}</span>
                        </div>

                        {isExpanded && (
                          <div className="ecue-list">
                            {matchingEcues.map((ecue) => {
                              const isSelected = selectedEcue?.ecue.id === ecue.id;
                              return (
                                <div
                                  key={ecue.id}
                                  className={`ecue-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() =>
                                    setSelectedEcue({
                                      ecue,
                                      ueCode: ue.code,
                                      ueTitle: ue.title,
                                      semNumber: sem.number,
                                    })
                                  }
                                >
                                  <Folder size={15} className="ecue-folder-icon" />
                                  <div className="ecue-info">
                                    <span className="ecue-name">
                                      {ecue.code ? `[${ecue.code}] ` : ''}{ecue.title}
                                    </span>
                                    {ecue.ects && Number(ecue.ects) > 0 && (
                                      <span className="ecue-ects">{ecue.ects} ECTS</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Main Zone: Compartments Cards */}
        <div className="library-main-zone">
          {!selectedEcue ? (
            <div className="empty-selection glass-card">
              <Library size={36} className="text-muted" />
              <h3>Sélectionnez une ECUE</h3>
              <p>Choisissez une ECUE dans la liste de gauche pour consulter et classer ses documents.</p>
            </div>
          ) : (
            <div className="ecue-workspace">
              {/* Selected ECUE Banner */}
              <div className="ecue-workspace-header glass-card">
                <div className="ecue-title-group">
                  <span className="sem-tag">S{selectedEcue.semNumber}</span>
                  {selectedEcue.ueCode && <span className="ue-tag">{selectedEcue.ueCode}</span>}
                  <h2>
                    {selectedEcue.ecue.code ? `[${selectedEcue.ecue.code}] ` : ''}
                    {selectedEcue.ecue.title}
                  </h2>
                </div>

                {!fileOrganizer.isTauri && (
                  <div className="web-notice-pill" title="Miroir local disponible dans l'application Desktop">
                    <Info size={14} />
                    <span>Mode Web · App Desktop pour miroir OS</span>
                  </div>
                )}
              </div>

              {loadingDocs ? (
                <div className="docs-loading glass-card">Chargement des compartiments...</div>
              ) : (
                <div className="categories-grid">
                  {/* Category Cards */}
                  {categories.map((cat) => {
                    const catDocs = ecueDocs.filter((d) => d.categoryId === cat.id);
                    const isDragOver = dragOverCatId === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className={`category-card glass-card ${isDragOver ? 'drag-over' : ''}`}
                        onDragOver={(e) => handleDragOverCategory(e, cat.id)}
                        onDragLeave={handleDragLeaveCategory}
                        onDrop={(e) => handleDropOnCategory(e, cat)}
                      >
                        <div className="category-card-header">
                          <div className="cat-title-row">
                            <Folder size={18} className="text-indigo" />
                            <h3>{cat.name}</h3>
                            <span className="count-badge">{catDocs.length}</span>
                          </div>

                          <div className="cat-actions">
                            <button
                              className="icon-action-btn"
                              onClick={() => handleOpenFolder(cat.name)}
                              title={`Ouvrir le sous-dossier ${cat.name}`}
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              className="icon-action-btn btn-delete"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              title="Supprimer ce compartiment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Documents List inside Category */}
                        <div className="category-docs-list">
                          {catDocs.length === 0 ? (
                            <div className="drop-hint">
                              <UploadCloud size={20} />
                              <span>Glissez-déposez vos fichiers ici</span>
                            </div>
                          ) : (
                            catDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="doc-item-row"
                                draggable
                                onDragStart={(e) => handleDocDragStart(e, doc)}
                                onClick={() => {
                                  const previewUrl = docService.getPreviewUrl(doc.id);
                                  window.open(previewUrl, '_blank');
                                }}
                                title="Cliquer pour prévisualiser · Glisser pour déplacer"
                              >
                                {getDocIcon(doc.mimeType, doc.originalName)}
                                <div className="doc-item-name">{doc.originalName}</div>
                                <span className="doc-item-size">{formatSize(doc.fileSize)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Unclassified Category Card (Non Classés) */}
                  {(() => {
                    const unclassifiedDocs = ecueDocs.filter((d) => !d.categoryId);
                    const isDragOver = dragOverCatId === 'unclassified';

                    return (
                      <div
                        className={`category-card glass-card unclassified-card ${isDragOver ? 'drag-over' : ''}`}
                        onDragOver={(e) => handleDragOverCategory(e, 'unclassified')}
                        onDragLeave={handleDragLeaveCategory}
                        onDrop={(e) => handleDropOnCategory(e, null)}
                      >
                        <div className="category-card-header">
                          <div className="cat-title-row">
                            <Folder size={18} className="text-amber" />
                            <h3>Non classé</h3>
                            <span className="count-badge">{unclassifiedDocs.length}</span>
                          </div>
                        </div>

                        <div className="category-docs-list">
                          {unclassifiedDocs.length === 0 ? (
                            <div className="drop-hint text-muted">
                              <span>Aucun document non classé</span>
                            </div>
                          ) : (
                            unclassifiedDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="doc-item-row"
                                draggable
                                onDragStart={(e) => handleDocDragStart(e, doc)}
                                onClick={() => {
                                  const previewUrl = docService.getPreviewUrl(doc.id);
                                  window.open(previewUrl, '_blank');
                                }}
                              >
                                {getDocIcon(doc.mimeType, doc.originalName)}
                                <div className="doc-item-name">{doc.originalName}</div>
                                <span className="doc-item-size">{formatSize(doc.fileSize)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCatModal && (
        <div className="modal-backdrop">
          <div className="glass-card modal-content" style={{ width: '360px', padding: '1.5rem' }}>
            <h3>Nouveau Compartiment</h3>
            <p className="subtitle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Créera automatiquement un sous-dossier correspondant sur votre ordinateur.
            </p>
            <form onSubmit={handleCreateCategory}>
              <input
                type="text"
                placeholder="ex: Annales, Projets, TP, Resumés..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'var(--text-primary)',
                  marginBottom: '1rem',
                }}
                autoFocus
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddCatModal(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .library-page {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .page-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .library-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 1rem;
          align-items: flex-start;
        }

        .library-sidebar {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 80vh;
        }

        .sidebar-search {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sidebar-search input {
          width: 100%;
          padding: 0.4rem 0.6rem 0.4rem 2.2rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.25);
          color: var(--text-primary);
          font-size: 0.8rem;
        }

        .search-icon {
          position: absolute;
          left: 0.6rem;
          color: var(--text-muted);
        }

        .tree-scroll {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .sem-header {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 0.35rem;
        }

        .ue-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem 0.35rem;
          border-radius: 4px;
        }
        .ue-header:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .ue-code-badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
        }

        .ue-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ecue-list {
          padding-left: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.25rem;
        }

        .ecue-item {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.8rem;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .ecue-item:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-primary);
        }
        .ecue-item.selected {
          background: rgba(99, 102, 241, 0.2);
          color: var(--text-primary);
          font-weight: 600;
          border-left: 3px solid #6366f1;
        }

        .ecue-folder-icon {
          color: #6366f1;
          flex-shrink: 0;
        }

        .ecue-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .ecue-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ecue-ects {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        .library-main-zone {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ecue-workspace-header {
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ecue-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .sem-tag, .ue-tag {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
        }

        .web-notice-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: 0.25rem 0.65rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1rem;
        }

        .category-card {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border: 2px dashed rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          transition: all 0.2s ease;
          min-height: 220px;
        }

        .category-card.drag-over {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.12);
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
        }

        .category-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .cat-title-row {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .cat-title-row h3 {
          font-size: 0.95rem;
          font-weight: 700;
        }

        .count-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.1rem 0.4rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-muted);
        }

        .cat-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .category-docs-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          flex: 1;
        }

        .drop-hint {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 2rem 0;
          color: var(--text-muted);
          font-size: 0.78rem;
          text-align: center;
        }

        .doc-item-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.65rem;
          border-radius: 6px;
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.06);
          cursor: grab;
          transition: all 0.15s ease;
        }
        .doc-item-row:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
        }

        .doc-item-name {
          flex: 1;
          font-size: 0.8rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .doc-item-size {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .icon-action-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.2rem;
          border-radius: 4px;
        }
        .icon-action-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }
        .icon-action-btn.btn-delete:hover {
          color: #ef4444;
        }

        .empty-selection, .docs-loading, .sidebar-loading, .sidebar-empty {
          padding: 3rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
};
