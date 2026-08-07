import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  BookOpen
} from 'lucide-react';

interface PDFViewerProps {
  previewUrl: string;
  title: string;
  onClose: () => void;
  onPageChange?: (page: number) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  previewUrl,
  title,
  onClose,
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => {
      const next = p + 1;
      if (onPageChange) onPageChange(next);
      return next;
    });
  }, [onPageChange]);

  const handlePrevPage = useCallback(() => {
    setCurrentPage((p) => {
      const prev = Math.max(1, p - 1);
      if (onPageChange) onPageChange(prev);
      return prev;
    });
  }, [onPageChange]);

  const handleZoomIn = () => setZoom((z) => Math.min(250, z + 20));
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 20));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPage();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        setZoom(100);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'r') {
        handleRotate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentPage, zoom, rotation, onClose, handleNextPage, handlePrevPage, toggleFullscreen]);

  return (
    <div
      ref={containerRef}
      className={`pdf-viewer-container ${isReadingMode ? 'reading-mode' : ''} ${
        isFullscreen ? 'fullscreen' : ''
      }`}
    >
      {/* Floating Toolbar */}
      <div className="pdf-toolbar">
        <div className="toolbar-section left">
          <button className="tool-btn" onClick={handlePrevPage} title="Page précédente (Flèche Gauche)">
            <ChevronLeft size={16} />
          </button>

          <div className="page-counter">
            <span>Page {currentPage}</span>
          </div>

          <button className="tool-btn" onClick={handleNextPage} title="Page suivante (Flèche Droite)">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="toolbar-section center">
          <button className="tool-btn" onClick={handleZoomOut} title="Zoom Arrière (-)">
            <ZoomOut size={16} />
          </button>
          <span className="zoom-label" onClick={() => setZoom(100)} title="Réinitialiser (0)">
            {zoom}%
          </span>
          <button className="tool-btn" onClick={handleZoomIn} title="Zoom Avant (+)">
            <ZoomIn size={16} />
          </button>

          <button className="tool-btn" onClick={handleRotate} title="Rotation 90° (R)">
            <RotateCw size={16} />
          </button>
        </div>

        <div className="toolbar-section right">
          <button
            className={`tool-btn ${isReadingMode ? 'active' : ''}`}
            onClick={() => setIsReadingMode(!isReadingMode)}
            title="Mode Lecture Focus"
          >
            <BookOpen size={16} />
          </button>

          <button className="tool-btn" onClick={toggleFullscreen} title="Plein Écran (F)">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Main Document Viewer Canvas Frame */}
      <div className="pdf-viewport">
        <div
          className="pdf-transform-wrapper"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-out',
          }}
        >
          <iframe
            src={`${previewUrl}#page=${currentPage}`}
            className="pdf-frame"
            title={title}
          />
        </div>
      </div>

      <style>{`
        .pdf-viewer-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #0b0f19;
          position: relative;
          overflow: hidden;
        }

        .pdf-viewer-container.reading-mode .pdf-toolbar {
          background: rgba(0, 0, 0, 0.4);
          opacity: 0.2;
          transition: opacity 0.2s ease;
        }

        .pdf-viewer-container.reading-mode .pdf-toolbar:hover {
          opacity: 1;
        }

        .pdf-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background: rgba(15, 23, 42, 0.9);
          border-bottom: 1px solid var(--border-color);
          z-index: 20;
          gap: 1rem;
        }

        .toolbar-section {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tool-btn {
          color: var(--text-secondary);
          padding: 0.35rem 0.55rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          transition: background var(--transition-fast), color var(--transition-fast);
        }

        .tool-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
        }

        .tool-btn.active {
          background: var(--gradient-primary);
          color: #ffffff;
        }

        .page-counter, .zoom-label {
          font-size: 0.775rem;
          font-weight: 600;
          color: var(--text-primary);
          cursor: pointer;
        }

        .pdf-viewport {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          position: relative;
        }

        .pdf-transform-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pdf-frame {
          width: 100%;
          height: 100%;
          border: none;
        }
      `}</style>
    </div>
  );
};
