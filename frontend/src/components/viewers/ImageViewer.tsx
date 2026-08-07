import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  previewUrl: string;
  title: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ previewUrl, title, onClose }) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          document.exitFullscreen?.();
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(300, z + 25));
      } else if (e.key === '-') {
        setZoom((z) => Math.max(30, z - 25));
      } else if (e.key === '0') {
        resetTransforms();
      } else if (e.key.toLowerCase() === 'r') {
        setRotation((r) => (r + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  const resetTransforms = () => {
    setZoom(100);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div ref={containerRef} className="image-viewer-container">
      {/* Toolbar */}
      <div className="image-toolbar">
        <div className="toolbar-section center">
          <button className="tool-btn" onClick={() => setZoom((z) => Math.max(30, z - 25))} title="Zoom Arrière (-)">
            <ZoomOut size={16} />
          </button>
          <span className="zoom-label" onClick={resetTransforms} title="Réinitialiser (0)">
            {zoom}%
          </span>
          <button className="tool-btn" onClick={() => setZoom((z) => Math.min(300, z + 25))} title="Zoom Avant (+)">
            <ZoomIn size={16} />
          </button>

          <button className="tool-btn" onClick={() => setRotation((r) => (r + 90) % 360)} title="Rotation (R)">
            <RotateCw size={16} />
          </button>

          <button className="tool-btn" onClick={resetTransforms} title="Réinitialiser vue">
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="toolbar-section right">
          <button className="tool-btn" onClick={toggleFullscreen} title="Plein Écran (F)">
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div
        className="image-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ cursor: zoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={previewUrl}
          alt={title}
          className="viewer-image"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        />
      </div>

      <style>{`
        .image-viewer-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #0b0f19;
          position: relative;
          overflow: hidden;
        }

        .image-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 1rem;
          background: rgba(15, 23, 42, 0.9);
          border-bottom: 1px solid var(--border-color);
          z-index: 20;
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
        }

        .tool-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
        }

        .zoom-label {
          font-size: 0.775rem;
          font-weight: 600;
          color: var(--text-primary);
          cursor: pointer;
        }

        .image-viewport {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 1rem;
        }

        .viewer-image {
          max-width: 90%;
          max-height: 80vh;
          object-fit: contain;
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  );
};
