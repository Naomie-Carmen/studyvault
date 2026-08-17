export interface SessionTypeConfig {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
}

export const DEFAULT_SESSION_TYPES: SessionTypeConfig[] = [
  { id: 'CM', label: 'Cours Magistral (CM)', color: '#6366f1', isDefault: true },
  { id: 'TD', label: 'Travaux Dirigés (TD)', color: '#06b6d4', isDefault: true },
  { id: 'TP', label: 'Travaux Pratiques (TP)', color: '#10b981', isDefault: true },
  { id: 'COMPO', label: 'Composition / Contrôle (Compo)', color: '#f59e0b', isDefault: true },
  { id: 'EXAM', label: 'Examen Final', color: '#ef4444', isDefault: true },
  { id: 'OTHER', label: 'Autre Séance', color: '#8b5cf6', isDefault: true },
];

const STORAGE_KEY = 'studyvault_session_types';

export function getSessionTypes(): SessionTypeConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SESSION_TYPES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Error loading session types:', err);
  }
  return DEFAULT_SESSION_TYPES;
}

export function saveSessionTypes(types: SessionTypeConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
  } catch (err) {
    console.error('Error saving session types:', err);
  }
}

export function getSessionTypeColor(typeId: string): string {
  const types = getSessionTypes();
  const match = types.find((t) => t.id.toUpperCase() === typeId.toUpperCase());
  return match?.color || '#6366f1';
}

export function getSessionTypeLabel(typeId: string): string {
  const types = getSessionTypes();
  const match = types.find((t) => t.id.toUpperCase() === typeId.toUpperCase());
  return match?.label || typeId;
}
