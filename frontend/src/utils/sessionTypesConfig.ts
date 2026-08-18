export interface SessionTypeConfig {
  id: string;
  label: string;
  color: string;
  isDefault?: boolean;
  perso: boolean;
}

export const DEFAULT_SESSION_TYPES: SessionTypeConfig[] = [
  { id: 'CM', label: 'Cours Magistral (CM)', color: '#6366f1', isDefault: true, perso: false },
  { id: 'TD', label: 'Travaux Dirigés (TD)', color: '#06b6d4', isDefault: true, perso: false },
  { id: 'TP', label: 'Travaux Pratiques (TP)', color: '#10b981', isDefault: true, perso: false },
  { id: 'COMPO', label: 'Composition / Contrôle (Compo)', color: '#f59e0b', isDefault: true, perso: false },
  { id: 'EXAM', label: 'Examen Final', color: '#ef4444', isDefault: true, perso: false },
  { id: 'RÉVISION', label: 'Révision', color: '#ec4899', isDefault: true, perso: true },
  { id: 'LOISIRS', label: 'Loisirs', color: '#8b5cf6', isDefault: true, perso: true },
  { id: 'SPORT', label: 'Sport', color: '#84cc16', isDefault: true, perso: true },
  { id: 'AUTRE', label: 'Autre (Perso)', color: '#64748b', isDefault: true, perso: true },
];

const STORAGE_KEY = 'studyvault_session_types';

export function getSessionTypes(): SessionTypeConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SESSION_TYPES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const mapped = parsed.map((item: any) => {
        const defaultMatch = DEFAULT_SESSION_TYPES.find(
          (d) => d.id.toUpperCase() === item.id.toUpperCase()
        );
        return {
          ...item,
          perso: item.perso ?? (defaultMatch ? defaultMatch.perso : false),
        };
      });

      DEFAULT_SESSION_TYPES.forEach((def) => {
        if (!mapped.some((m: SessionTypeConfig) => m.id.toUpperCase() === def.id.toUpperCase())) {
          mapped.push(def);
        }
      });

      return mapped;
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
