import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Clock, Sparkles } from 'lucide-react';
import { DocumentItem } from '../../types/document';
import * as searchService from '../../services/searchService';

interface GlobalSearchProps {
  onSelectDocument?: (doc: DocumentItem) => void;
  onNavigateSearch?: (query: string) => void;
}

const HISTORY_KEY = 'studyvault_search_history';

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSelectDocument,
  onNavigateSearch,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<DocumentItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setHistory(parsed.filter((h) => typeof h === 'string'));
      }
    } catch (_e) {
      /* ignore */
    }
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search logic (300ms)
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await searchService.searchDocuments({ q, limit: 5 });
      if (res.success && res.data && Array.isArray(res.data.documents)) {
        setResults(res.data.documents);
      } else {
        setResults([]);
      }
    } catch (_err) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const saveHistory = (term: string) => {
    if (!term.trim()) return;
    const clean = term.trim();
    const updated = [clean, ...history.filter((h) => h !== clean)].slice(0, 5);
    setHistory(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (_e) {
      /* ignore */
    }
  };

  const handleSelectDoc = (doc: DocumentItem) => {
    saveHistory(query);
    setIsOpen(false);
    if (onSelectDocument) onSelectDocument(doc);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    saveHistory(query);
    setIsOpen(false);
    if (onNavigateSearch) onNavigateSearch(query.trim());
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  return (
    <div className="global-search-container" ref={containerRef}>
      <form onSubmit={handleSubmit} className="search-input-wrapper">
        <Search size={16} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher un document, cours, TD... (Ctrl+K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query ? (
          <button
            type="button"
            className="clear-btn"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <div className="shortcut-badge">
            <span>Ctrl K</span>
          </div>
        )}
      </form>

      {/* Overlay Dropdown */}
      {isOpen && (
        <div className="search-dropdown-overlay glass-card">
          {loading ? (
            <div className="dropdown-loading">
              <Sparkles size={16} className="spinning text-indigo" />
              <span>Recherche en cours...</span>
            </div>
          ) : query.trim() ? (
            results.length > 0 ? (
              <div className="results-section">
                <span className="section-label">Résultats suggérés ({results.length})</span>
                {results.map((doc) => (
                  <div
                    key={doc.id}
                    className="result-item"
                    onClick={() => handleSelectDoc(doc)}
                  >
                    <FileText size={16} className="text-indigo" />
                    <div className="result-info">
                      <span className="result-name">{doc.originalName}</span>
                      <span className="result-meta">
                        {doc.docType.toUpperCase()} • {(doc.fileSize / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                ))}
                {onNavigateSearch && (
                  <button className="see-all-btn" onClick={handleSubmit}>
                    Voir tous les résultats pour "{query}" ➔
                  </button>
                )}
              </div>
            ) : (
              <div className="dropdown-empty">
                <span>Aucun document trouvé pour "{query}"</span>
              </div>
            )
          ) : history.length > 0 ? (
            <div className="history-section">
              <span className="section-label">Recherches récentes</span>
              {history.map((term, i) => (
                <div
                  key={i}
                  className="history-item"
                  onClick={() => handleHistoryClick(term)}
                >
                  <Clock size={14} className="text-muted" />
                  <span>{term}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dropdown-empty">
              <span>Tapez un nom de fichier, cours ou matière pour rechercher.</span>
            </div>
          )}
        </div>
      )}

      <style>{`
        .global-search-container {
          position: relative;
          width: 100%;
          max-width: 420px;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          position: relative;
          width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input-wrapper input {
          width: 100%;
          padding: 0.45rem 2.25rem 0.45rem 2.25rem;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.825rem;
          outline: none;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }

        .search-input-wrapper input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
        }

        .clear-btn {
          position: absolute;
          right: 0.6rem;
          color: var(--text-muted);
          padding: 0.2rem;
          border-radius: 50%;
        }

        .clear-btn:hover { color: var(--text-primary); }

        .shortcut-badge {
          position: absolute;
          right: 0.6rem;
          padding: 0.1rem 0.35rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-color);
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-dropdown-overlay {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 0.35rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: 100;
          overflow: hidden;
          max-height: 320px;
          overflow-y: auto;
        }

        .dropdown-loading, .dropdown-empty {
          padding: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .section-label {
          display: block;
          padding: 0.5rem 0.85rem 0.25rem 0.85rem;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .result-item, .history-item {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.5rem 0.85rem;
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .result-item:hover, .history-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .result-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .result-name {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-meta {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .history-item span {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .see-all-btn {
          width: 100%;
          padding: 0.6rem;
          text-align: center;
          font-size: 0.775rem;
          font-weight: 600;
          color: var(--primary);
          border-top: 1px solid var(--border-color);
          background: rgba(99, 102, 241, 0.05);
        }

        .see-all-btn:hover { background: rgba(99, 102, 241, 0.12); }
        .text-indigo { color: var(--primary); }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
