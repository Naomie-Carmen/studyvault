import { Request, Response } from 'express';
import { getVersionInfo } from '../services/versionService';

/**
 * GET /api/v1/version
 * Returns the current application version and release notes.
 * Used by:
 *   - Frontend UpdateBanner (polling for new deployments)
 *   - Changelog page
 *   - Tauri desktop "About" dialog
 */
export const getVersion = (_req: Request, res: Response): void => {
  const info = getVersionInfo();

  res.json({
    success: true,
    data: {
      version: info.version,
      releaseDate: info.releaseDate,
      channel: info.channel,
      notes: info.notes,
      history: info.history,
      // Tauri updater compatibility fields
      url: `https://github.com/studyvault/studyvault/releases/tag/v${info.version}`,
      signature: '', // populated by CI when generating signed updater bundles
    },
  });
};
