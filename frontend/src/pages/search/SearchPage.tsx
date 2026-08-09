import React, { useState, useEffect, useCallback } from 'react';
import { DocumentItem } from '../../types/document';
import { SearchResult, SearchQueryParams } from '../../types/search';
import { AcademicStructureTree } from '../../types/structure';
import * as searchService from '../../services/searchService';
import * as structureService from '../../services/academicStructureService';
import * as docService from '../../services/documentService';
import { FileCard } from '../../components/documents/FileCard';
import { FilePreviewModal } from '../../components/documents/FilePreviewModal';
import { DeleteConfirmModal } from '../../components/structure/DeleteConfirmModal';
import { 
  Search, 
  Filter, 
  Sparkles, 
  Grid, 
  List, 
  RefreshCw, 
  Star, 
  Trash2, 
  FileCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SearchPageProps {
  initialQuery?: string;
}

const VIEW_MODE_KEY = 'studyvault_view_mode';

export const SearchPage: React.FC<SearchPageProps> = ({ initialQuery = '' }) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [isFavoriteOnly, setIsFavoriteOnly] = useState(false);
  const [sortOption, setSortOption] = useState<NonNullable<SearchQueryParams['sort']>>('date_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [favoritesMap, setFavoritesMap] = useState<Record<string, boolean>>({});
  const [quickAccessMap, setQuickAccessMap] = useState<Record<string, boolean>>({});
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);

  // Load View Mode preference
  useEffect(() => {
    const savedView = localStorage.getItem(VIEW_MODE_KEY);
    if (savedView === 'list' || savedView === 'grid') setViewMode(savedView);
  }, []);

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const loadInitialData = useCallback(async () => {
    try {
      const [treeRes, favRes, quickRes] = await Promise.all([
        structureService.getStructureTree(),
        searchService.getFavorites(),
        searchService.getQuickAccess(),
      ]);

      if (treeRes.success && treeRes.data) setTree(treeRes.data);

      if (favRes.success && Array.isArray(favRes.data)) {
        const map: Record<string, boolean> = {};
        favRes.data.forEach((f) => {
          map[f.documentId] = true;
        });
        setFavoritesMap(map);
      }

      if (quickRes.success && Array.isArray(quickRes.data)) {
        const map: Record<string, boolean> = {};
        quickRes.data.forEach((q) => {
          map[q.documentId] = true;
        });
        setQuickAccessMap(map);
      }
    } catch (_err) {
      /* ignore */
    }
  }, []);

  const executeSearch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchService.searchDocuments({
        q: query || undefined,
        subjectId: selectedSubjectId || undefined,
        semesterId: selectedSemesterId || undefined,
        docType: selectedDocType || undefined,
        isFavorite: isFavoriteOnly ? true : undefined,
        sort: sortOption,
        page,
        limit: 12,
      });

      if (res.success && res.data) {
        setSearchResult(res.data);
      }
    } catch (err) {
      console.error('Error executing search:', err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedSubjectId, selectedSemesterId, selectedDocType, isFavoriteOnly, sortOption, page]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    executeSearch();
  }, [executeSearch]);

  const handleToggleFavorite = async (doc: DocumentItem) => {
    const isFav = !!favoritesMap[doc.id];
    if (isFav) {
      await searchService.removeFavorite(doc.id);
      setFavoritesMap((prev) => ({ ...prev, [doc.id]: false }));
    } else {
      const res = await searchService.addFavorite(doc.id);
      if (res.success) {
        setFavoritesMap((prev) => ({ ...prev, [doc.id]: true }));
      }
    }
  };

  const handleToggleQuickAccess = async (doc: DocumentItem) => {
    const isQuick = !!quickAccessMap[doc.id];
    if (isQuick) {
      await searchService.removeQuickAccess(doc.id);
      setQuickAccessMap((prev) => ({ ...prev, [doc.id]: false }));
    } else {
      const res = await searchService.addQuickAccess(doc.id);
      if (res.success) {
        setQuickAccessMap((prev) => ({ ...prev, [doc.id]: true }));
      }
    }
  };

  const handleSelectToggle = (doc: DocumentItem) => {
    setSelectedDocIds((prev) =>
      prev.includes(doc.id) ? prev.filter((id) => id !== doc.id) : [...prev, doc.id]
    );
  };

  const handleBulkFavorite = async () => {
    for (const id of selectedDocIds) {
      await searchService.addFavorite(id);
    }
    setSelectedDocIds([]);
    loadInitialData();
    executeSearch();
  };

  const handleBulkDelete = async () => {
    for (const id of selectedDocIds) {
      await docService.softDeleteDocument(id);
    }
    setSelectedDocIds([]);
    executeSearch();
  };

  const handleSoftDelete = async () => {
    if (deleteTarget) {
      await docService.softDeleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      executeSearch();
    }
  };

  const clearAllFilters = () => {
    setQuery('');
    setSelectedDocType('');
    setSelectedSubjectId('');
    setSelectedSemesterId('');
    setIsFavoriteOnly(false);
    setSortOption('date_desc');
    setPage(1);
  };

  return (
    <div className="search-page">
      {/* Header */}
      <div className="glass-card page-header">
        <div className="header-info">
          <div className="header-badge">
            <Sparkles size={14} />
            <span>Bibliothèque Académique</span>
          </div>
          <h2>Recherche Globale & Filtres Multi-Critères</h2>
          <p>
            Retrouvez rapidement n'importe quel document par nom, matière, type ou statut.
          </p>
        </div>
      </div>

      <div className="search-layout">
        {/* Sidebar Filters */}
        <div className="glass-card filters-sidebar">
          <div className="sidebar-title">
            <Filter size={16} className="text-indigo" />
            <span>Filtres de recherche</span>
          </div>

          <div className="filter-group">
            <label>Type de Document</label>
            <select
              value={selectedDocType}
              onChange={(e) => {
                setSelectedDocType(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous les types</option>
              <option value="cours">COURS</option>
              <option value="TD">TRAVAUX DIRIGÉS (TD)</option>
              <option value="TP">TRAVAUX PRATIQUES (TP)</option>
              <option value="examen">EXAMENS & ANNALES</option>
              <option value="autre">AUTRES</option>
            </select>
          </div>

          {tree && (
            <div className="filter-group">
              <label>Semestre</label>
              <select
                value={selectedSemesterId}
                onChange={(e) => {
                  setSelectedSemesterId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Tous les semestres</option>
                {tree.semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    Semestre {s.number} ({s.label})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label>Favoris uniquement</label>
            <button
              className={`toggle-fav-btn ${isFavoriteOnly ? 'active' : ''}`}
              onClick={() => {
                setIsFavoriteOnly(!isFavoriteOnly);
                setPage(1);
              }}
            >
              <Star size={16} fill={isFavoriteOnly ? 'currentColor' : 'none'} />
              <span>{isFavoriteOnly ? 'Favoris uniquement' : 'Tous les documents'}</span>
            </button>
          </div>

          <button className="reset-filters-btn" onClick={clearAllFilters}>
            Effacer tous les filtres
          </button>
        </div>

        {/* Search Content */}
        <div className="search-workspace">
          {/* Top Bar: Search Input & View Toggles */}
          <div className="glass-card workspace-top-bar">
            <div className="search-input-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Rechercher par nom, matière, UE..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="sort-view-controls">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as NonNullable<SearchQueryParams['sort']>)}
                className="sort-select"
              >
                <option value="date_desc">Récents d'abord</option>
                <option value="date_asc">Plus anciens d'abord</option>
                <option value="name_asc">Nom (A-Z)</option>
                <option value="name_desc">Nom (Z-A)</option>
                <option value="size_desc">Taille décroissante</option>
              </select>

              <div className="view-mode-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => toggleViewMode('grid')}
                  title="Vue Grille"
                >
                  <Grid size={16} />
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => toggleViewMode('list')}
                  title="Vue Liste"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar (when selected items > 0) */}
          {selectedDocIds.length > 0 && (
            <div className="bulk-action-bar glass-card">
              <span>{selectedDocIds.length} document(s) sélectionné(s)</span>
              <div className="bulk-actions">
                <button className="btn-bulk-fav" onClick={handleBulkFavorite}>
                  <Star size={14} />
                  <span>Ajouter aux favoris</span>
                </button>
                <button className="btn-bulk-del" onClick={handleBulkDelete}>
                  <Trash2 size={14} />
                  <span>Supprimer</span>
                </button>
              </div>
            </div>
          )}

          {/* Search Results Display */}
          {loading ? (
            <div className="glass-card empty-card">
              <RefreshCw size={24} className="spinning text-indigo" />
              <p>Recherche des documents en cours...</p>
            </div>
          ) : searchResult && searchResult.documents.length > 0 ? (
            <>
              <div className="results-header-info">
                <span>{searchResult.total} document(s) trouvé(s)</span>
              </div>

              <div className={`results-container ${viewMode}`}>
                {searchResult.documents.map((doc) => (
                  <FileCard
                    key={doc.id}
                    document={doc}
                    isFavorite={!!favoritesMap[doc.id]}
                    isQuickAccess={!!quickAccessMap[doc.id]}
                    isSelected={selectedDocIds.includes(doc.id)}
                    onPreview={(d) => setPreviewDoc(d)}
                    onDelete={(d) => setDeleteTarget(d)}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleQuickAccess={handleToggleQuickAccess}
                    onSelectToggle={handleSelectToggle}
                  />
                ))}
              </div>

              {/* Pagination */}
              {searchResult.totalPages > 1 && (
                <div className="pagination-bar">
                  <button
                    className="page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft size={16} />
                    <span>Précédent</span>
                  </button>

                  <span className="page-info">
                    Page {searchResult.page} sur {searchResult.totalPages}
                  </span>

                  <button
                    className="page-btn"
                    disabled={page >= searchResult.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <span>Suivant</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card empty-card">
              <FileCheck size={40} className="text-indigo" />
              <h3>Aucun document ne correspond à votre recherche</h3>
              <p>Essayez de modifier votre mot-clé ou réinitialisez les filtres.</p>
              <button className="reset-filters-btn mt-2" onClick={clearAllFilters}>
                Réinitialiser les filtres
              </button>
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
        .search-page {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .page-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
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

        .search-layout {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 850px) {
          .search-layout { grid-template-columns: 1fr; }
        }

        .filters-sidebar {
          padding: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sidebar-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .filter-group label {
          font-size: 0.775rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .filter-group select {
          width: 100%;
          padding: 0.5rem;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.825rem;
          outline: none;
        }

        .toggle-fav-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 0.8rem;
        }

        .toggle-fav-btn.active {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border-color: rgba(245, 158, 11, 0.3);
        }

        .reset-filters-btn {
          margin-top: 0.5rem;
          padding: 0.45rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 0.775rem;
        }

        .reset-filters-btn:hover { color: var(--text-primary); }

        .search-workspace {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .workspace-top-bar {
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .search-input-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 240px;
        }

        .search-icon { position: absolute; left: 0.75rem; color: var(--text-muted); }

        .search-input-box input {
          width: 100%;
          padding: 0.55rem 0.75rem 0.55rem 2.25rem;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.85rem;
          outline: none;
        }

        .sort-view-controls {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .sort-select {
          padding: 0.45rem 0.75rem;
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 0.8rem;
          outline: none;
        }

        .view-mode-toggle {
          display: flex;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.15rem;
        }

        .view-btn {
          padding: 0.35rem 0.55rem;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
        }

        .view-btn.active {
          background: var(--primary);
          color: #ffffff;
        }

        .bulk-action-bar {
          padding: 0.65rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3);
          font-size: 0.825rem;
          font-weight: 600;
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-bulk-fav {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          font-size: 0.775rem;
          font-weight: 600;
        }

        .btn-bulk-del {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          background: var(--status-error);
          color: #ffffff;
          font-size: 0.775rem;
          font-weight: 600;
        }

        .results-header-info {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: -0.25rem;
        }

        .results-container.grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }

        .results-container.list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1rem;
        }

        .page-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 0.8rem;
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .empty-card {
          padding: 3.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .text-indigo { color: var(--primary); }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
