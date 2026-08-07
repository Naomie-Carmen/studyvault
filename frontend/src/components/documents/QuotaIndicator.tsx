import React, { useState, useEffect } from 'react';
import { UserQuota } from '../../types/document';
import * as docService from '../../services/documentService';
import { HardDrive, Server } from 'lucide-react';

export const QuotaIndicator: React.FC = () => {
  const [quota, setQuota] = useState<UserQuota | null>(null);

  useEffect(() => {
    docService.getQuota().then((res) => {
      if (res.success && res.data) setQuota(res.data);
    });
  }, []);

  if (!quota) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="quota-indicator-box">
      <div className="quota-header">
        <div className="quota-title">
          <HardDrive size={15} className="text-indigo" />
          <span>Espace Disque Utilisé</span>
        </div>
        <span className="quota-percentage">{quota.usedPercentage}%</span>
      </div>

      <div className="quota-bar-bg">
        <div
          className={`quota-bar-fill ${quota.usedPercentage > 85 ? 'warning' : ''}`}
          style={{ width: `${quota.usedPercentage}%` }}
        />
      </div>

      <div className="quota-footer">
        <span>{formatSize(quota.usedBytes)} / 2.0 GB</span>
        <span className="doc-count">
          <Server size={12} />
          {quota.documentCount} fichier(s)
        </span>
      </div>

      <style>{`
        .quota-indicator-box {
          padding: 0.85rem 1rem;
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .quota-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .quota-title {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.775rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .quota-percentage {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary);
        }

        .quota-bar-bg {
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }

        .quota-bar-fill {
          height: 100%;
          background: var(--gradient-primary);
          transition: width 0.3s ease;
        }

        .quota-bar-fill.warning {
          background: var(--status-warning);
        }

        .quota-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .doc-count {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
