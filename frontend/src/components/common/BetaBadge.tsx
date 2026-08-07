import React from 'react';
import { Sparkles } from 'lucide-react';

interface BetaBadgeProps {
  size?: 'sm' | 'md';
}

export const BetaBadge: React.FC<BetaBadgeProps> = ({ size = 'sm' }) => {
  return (
    <div className={`beta-badge ${size}`} title="Plateforme actuellement en version Bêta Fermée">
      <Sparkles size={size === 'sm' ? 11 : 13} className="beta-sparkle" />
      <span>BÊTA</span>

      <style>{`
        .beta-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
          border: 1px solid rgba(168, 85, 247, 0.4);
          color: #c084fc;
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.15);
          user-select: none;
        }
        .beta-badge.sm { font-size: 0.65rem; }
        .beta-badge.md { font-size: 0.75rem; padding: 0.25rem 0.65rem; }
        .beta-sparkle { color: #f472b6; }
      `}</style>
    </div>
  );
};
