import React, { useState, useEffect, useCallback } from 'react';
import { DocumentItem } from '../../types/document';
import { AcademicStructureTree } from '../../types/structure';
import * as docService from '../../services/documentService';
import * as structureService from '../../services/academicStructureService';
import { FileUploadZone } from '../../components/documents/FileUploadZone';
import { FileCard } from '../../components/documents/FileCard';
import { FilePreviewModal } from '../../components/documents/FilePreviewModal';
import { QuotaIndicator } from '../../components/documents/QuotaIndicator';
import { DeleteConfirmModal } from '../../components/structure/DeleteConfirmModal';
import { 
  FolderTree, 
  Search, 
  Sparkles, 
  RefreshCw, 
  BookOpen, 
  FileCheck,
  CheckSquare,
  Trash2,
  X
} from 'lucide-react';

export const AcademicDocumentsPage: React.FC = () => {
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Batch selection state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, docsRes] = await Promise.all([
        structureService.getStructureTree(),
        docService.getDocuments({
          subjectId: selectedSubjectId || undefined,
          docType: selectedDocType || undefined,
          search: searchQuery || undefined,
        }),
      ]);

      if (treeRes.success && treeRes.data) setTree(treeRes.data);
      if (docsRes.success && Array.isArray(docsRes.data)) setDocuments(docsRes.data);
    } catch (err) {
      console.error('Error loading academic documents:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId, selectedDocType, searchQuery]);

  useEffect(() => {
    loadData();
    setSelectedDocIds([]);
  }, [loadData]);

  const handleSoftDelete = async () => {
    if (deleteTarget) {
      await docService.softDeleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      loadData();
    }
  };

  const toggleSelectDoc = (doc: DocumentItem) => {
    setSelectedDocIds((prev) =>
      prev.includes(doc.id) ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedDocIds.length === 0) return;
    for (const id of selectedDocIds) {
      await docService.softDeleteDocument(id);
    }
    setSelectedDocIds([]);
    loadData();
  };

  const handleBatchChangeType = async (newType: string) => {
    if (selectedDocIds.length === 0 || !newType) return;
    for (const id of selectedDocIds) {
      await docService.updateDocument(id, { docType: newType as any });
    }
    setSelectedDocIds([]);
    loadData();
  };

  const handleBatchReassignSubject = async (newSubjectId: string) => {
    if (selectedDocIds.length === 0 || !newSubjectId) return;
    for (const id of selectedDocIds) {
      await docService.updateDocument(id, { subjectId: newSubjectId });
    }
    setSelectedDocIds([]);
    loadData();
  };

  // Flatten subjects for batch reassign dropdown
  const allSubjectsList: { id: string; name: string }[] = [];
  if (tree && Array.isArray(tree.semesters)) {
    tree.semesters.forEach((sem) => {
      sem.ues.forEach((ue) => {
        ue.directSubjects.forEach((sub) => {
          allSubjectsList.push({ id: sub.id, name: `S${sem.number} — ${sub.name}` });
        });
        ue.ecues.forEach((ecue) => {
          ecue.subjects.forEach((sub) => {
            allSubjectsList.push({ id: sub.id, name: `S${sem.number} — ${sub.name}` });
          });
        });
      });
    });
  }

  return (
    <div className="academic-docs-page">
      {/* Header Banner */}
      <div className="glass-card page-header">
        <div className="header-info">
          <div className="header-badge">
            <Sparkles size={14} />
            <span>Gestion Documentaire Académique</span>
          </div>
          <h2>Bibliothèque de Cours & Examens</h2>
          <p>
            Classez vos cours, TD, TP et annales d'examens directement par matière.
          </p>
        </div>

        <QuotaIndicator />
      </div>

      <div className="docs-main-layout">
        {/* Sidebar Subject Selector */}
        <div className="glass-card subjects-sidebar">
          <h4 className="sidebar-title">
            <FolderTree size={16} className="text-indigo" />
            <span>Matières d'Enseignement</span>
          </h4>

          <button
            className={`subject-selector-btn ${!selectedSubjectId ? 'active' : ''}`}
            onClick={() => setSelectedSubjectId(null)}
          >
            <BookOpen size={15} />
            <span>Toutes les matières</span>
          </button>

          {tree && Array.isArray(tree.semesters) && tree.semesters.map((sem) => (
            <div key={sem.id} className="semester-group">
              <span className="semester-group-label">S{sem.number} — {sem.label}</span>
              {sem.ues.map((ue) => (
                <div key={ue.id} className="ue-group">
                  {/* Subjects under ECUE */}
                  {ue.ecues.map((ecue) =>
                    ecue.subjects.map((sub) => (
                      <button
                        key={sub.id}
                        className={`subject-selector-btn ${selectedSubjectId === sub.id ? 'active' : ''}`}
                        onClick={() => setSelectedSubjectId(sub.id)}
                      >
                        <div
                          className="subject-color-dot"
                          style={{ backgroundColor: sub.color || '#6366f1' }}
                        />
                        <span className="subject-btn-name">{sub.name}</span>
                      </button>
                    ))
                  )}

                  {/* Direct Subjects under UE */}
                  {ue.directSubjects.map((sub) => (
                    <button
                      key={sub.id}
                      className={`subject-selector-btn ${selectedSubjectId === sub.id ? 'active' : ''}`}
                      onClick={() => setSelectedSubjectId(sub.id)}
                    >
                      <div
                        className="subject-color-dot"
                        style={{ backgroundColor: sub.color || '#6366f1' }}
                      />
                      <span className="subject-btn-name">{sub.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Documents Content Area */}
        <div className="docs-workspace">
          {/* Upload Zone & Filter Bar */}
          <FileUploadZone
            subjectId={selectedSubjectId || undefined}
            onUploadSuccess={() => loadData()}
          />

          {/* Search & Type Filter Header */}
          <div className="filter-bar glass-card">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Rechercher un document par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="doc-type-filter">
              <button
                className={`filter-btn ${!selectedDocType ? 'active' : ''}`}
                onClick={() => setSelectedDocType(null)}
              >
                Tous
              </button>
              {(['cours', 'TD', 'TP', 'examen', 'autre'] as const).map((t) => (
                <button
                  key={t}
                  className={`filter-btn ${selectedDocType === t ? 'active' : ''}`}
                  onClick={() => setSelectedDocType(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Batch Action Floating Bar */}
          {selectedDocIds.length > 0 && (
            <div className="batch-action-bar glass-card">
              <div className="batch-info">
                <CheckSquare size={16} className="text-indigo" />
                <span>{selectedDocIds.length} document(s) sélectionné(s)</span>
              </div>

              <div className="batch-actions-group">
                <button className="batch-btn select-all" onClick={toggleSelectAll}>
                  {selectedDocIds.length === documents.length ? 'Tout décocher' : 'Tout sélectionner'}
                </button>

                <select
                  className="batch-select"
                  onChange={(e) => {
                    if (e.target.value) handleBatchChangeType(e.target.value);
                    e.target.value = '';
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>🏷️ Catégorie...</option>
                  <option value="cours">COURS</option>
                  <option value="TD">TD</option>
                  <option value="TP">TP</option>
                  <option value="examen">EXAMEN</option>
                  <option value="autre">AUTRE</option>
                </select>

                {allSubjectsList.length > 0 && (
                  <select
                    className="batch-select"
                    onChange={(e) => {
                      if (e.target.value) handleBatchReassignSubject(e.target.value);
                      e.target.value = '';
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>📁 Matière...</option>
                    {allSubjectsList.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                )}

                <button className="batch-btn delete" onClick={handleBatchDelete}>
                  <Trash2 size={14} />
                  <span>Supprimer</span>
                </button>

                <button className="batch-btn close" onClick={() => setSelectedDocIds([])} title="Fermer la sélection">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Documents Grid */}
          {loading ? (
            <div className="glass-card empty-card">
              <RefreshCw size={24} className="spinning text-indigo" />
              <p>Chargement des documents...</p>
            </div>
          ) : documents.length > 0 ? (
            <div className="documents-grid">
              {documents.map((doc) => (
                <FileCard
                  key={doc.id}
                  document={doc}
                  isSelected={selectedDocIds.includes(doc.id)}
                  onSelectToggle={(d) => toggleSelectDoc(d)}
                  onPreview={(d) => setPreviewDoc(d)}
                  onDelete={(d) => setDeleteTarget(d)}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card empty-card">
              <FileCheck size={40} className="text-indigo" />
              <h3>Aucun document trouvé</h3>
              <p>
                Importez vos premiers cours, exercices ou annales dans cette matière via la zone de téléchargement.
              </p>
            </div>
          )}
        </div>
      </div>

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
        .academic-docs-page {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .page-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-full);
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          font-size: 0.725rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
        }

        .header-info h2 { font-size: 1.4rem; margin-bottom: 0.2rem; }
        .header-info p { font-size: 0.85rem; color: var(--text-muted); }

        .docs-main-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 850px) {
          .docs-main-layout {
            grid-template-columns: 1fr;
          }
        }

        .subjects-sidebar {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 70vh;
          overflow-y: auto;
        }

        .sidebar-title {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .semester-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-top: 0.5rem;
        }

        .semester-group-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          padding-left: 0.25rem;
        }

        .subject-selector-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.65rem;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 0.8rem;
          font-weight: 500;
          width: 100%;
          text-align: left;
        }

        .subject-selector-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .subject-selector-btn.active {
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          font-weight: 600;
        }

        .subject-color-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .subject-btn-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .docs-workspace {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .filter-bar {
          padding: 0.65rem 0.875rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 200px;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          color: var(--text-muted);
        }

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

        .doc-type-filter {
          display: flex;
          gap: 0.25rem;
        }

        .filter-btn {
          padding: 0.3rem 0.6rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 0.725rem;
          font-weight: 600;
        }

        .filter-btn.active {
          background: var(--gradient-primary);
          color: #ffffff;
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

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .text-indigo { color: var(--primary); }

        .batch-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.35);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          gap: 1rem;
          flex-wrap: wrap;
        }

        .batch-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          font-size: 0.85rem;
          color: #c7d2fe;
        }

        .batch-actions-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .batch-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .batch-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .batch-btn.delete {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.4);
        }
        .batch-btn.delete:hover {
          background: rgba(239, 68, 68, 0.35);
          color: #ffffff;
        }

        .batch-select {
          padding: 0.35rem 0.65rem;
          border-radius: 6px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 0.8rem;
          outline: none;
        }
      `}</style>
    </div>
  );
};
