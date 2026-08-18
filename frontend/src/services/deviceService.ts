let cachedDeviceId: string | null = null;

/**
 * Retrieves or generates a unique stable device ID for Desktop (Tauri) or Web.
 * Desktop: Uses Tauri invoke('get_device_id') -> DESKTOP-HOST-USER
 * Web: Uses persistent localStorage identifier -> WEB-{uaHash}-{screen}-{seed}
 */
export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const isTauri = typeof window !== 'undefined' && Boolean(
    (window as any).__TAURI__ ||
    (window as any).__TAURI_IPC__ ||
    (window as any).__TAURI_METADATA__ ||
    window.location.protocol.startsWith('tauri') ||
    window.location.protocol.startsWith('asset')
  );

  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const desktopId = await invoke<string>('get_device_id');
      if (desktopId && desktopId.trim().length > 0) {
        cachedDeviceId = desktopId.trim();
        return cachedDeviceId;
      }
    } catch (_err) {
      // Fallback to web persistent ID if Tauri call fails
    }
  }

  if (typeof window !== 'undefined') {
    let webId = localStorage.getItem('studyvault_device_id');
    if (!webId) {
      const randomSeed = Math.random().toString(36).substring(2, 10).toUpperCase();
      const uaHash = btoa(navigator.userAgent || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
      const screenHash = `${window.screen.width}X${window.screen.height}`;
      webId = `WEB-${uaHash}-${screenHash}-${randomSeed}`;
      localStorage.setItem('studyvault_device_id', webId);
    }
    cachedDeviceId = webId;
    return cachedDeviceId;
  }

  return 'WEB-UNKNOWN-DEVICE';
}
