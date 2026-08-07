import React, { useState, useEffect, useCallback } from 'react';
import { FavoriteItem } from '../../types/search';
import { DocumentItem } from '../../types/document';
import * as searchService from '../../services/searchService';
import * as docService from '../../services/documentService';
import { FileCard } from '../../components/documents/FileCard';
import { FilePreviewModal } from '../../components/documents/FilePreviewModal';
import { DeleteConfirmModal } from '../../components/structure/DeleteConfirmModal';
import { Star, RefreshCw } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchService.getFavorites();
      if (res.success && res.data) setFavorites(res.data);
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleToggleFavorite = async (doc: DocumentItem) => {
    await searchService.removeFavorite(doc.id);
    loadFavorites();
  };

  const handleSoftDelete = async () => {
    if (deleteTarget) {
      await docService.softDeleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      loadFavorites();
    }
  };

  return (
    <div className="favorites-page">
      {/* Header */}
      <div className="glass-card page-header fav-header">
        <div className="header-info">
          <div className="header-badge fav-badge">
            <Star size={14} fill="currentColor" />
            <span>Documents Épinglés</span>
          </div>
          <h2>Mes Favoris</h2>
          <p>Accédez instantanément à vos documents les plus essentiels.</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-card empty-card">
          <RefreshCw size={24} className="spinning text-indigo" />
          <p>Chargement des favoris...</p>
        </div>
      ) : favorites.length > 0 ? (
        <div className="documents-grid">
          {favorites.map((fav) => (
            <FileCard
              key={fav.id}
              document={fav.document}
              isFavorite={true}
              onPreview={(d) => setPreviewDoc(d)}
              onDelete={(d) => setDeleteTarget(d)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card empty-card">
          <Star size={40} className="text-warning" />
          <h3>Aucun favori pour le moment</h3>
          <p>Cliquez sur l'icône étoile de n'importe quel document pour l'ajouter à cette liste.</p>
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
        .favorites-page {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .fav-header {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%);
          border-color: rgba(245, 158, 11, 0.3);
        }

        .page-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .fav-badge {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
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

        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
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
        .text-warning { color: var(--status-warning); }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
