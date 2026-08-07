import path from 'path';
import fs from 'fs';

interface VersionHistory {
  version: string;
  releaseDate: string;
  highlights: string[];
}

interface VersionInfo {
  version: string;
  releaseDate: string;
  channel: string;
  notes: string[];
  history: VersionHistory[];
}

let _cachedVersion: VersionInfo | null = null;

export function getVersionInfo(): VersionInfo {
  if (_cachedVersion) return _cachedVersion;

  try {
    const versionFilePath = path.join(__dirname, '../../version.json');
    const raw = fs.readFileSync(versionFilePath, 'utf-8');
    _cachedVersion = JSON.parse(raw) as VersionInfo;
  } catch (_err) {
    // Fallback if file is missing
    _cachedVersion = {
      version: '1.0.0',
      releaseDate: new Date().toISOString().split('T')[0],
      channel: 'stable',
      notes: ['StudyVault — Production Ready'],
      history: [],
    };
  }

  return _cachedVersion;
}

// Invalidate cache (for hot-reload in dev)
export function invalidateVersionCache(): void {
  _cachedVersion = null;
}
