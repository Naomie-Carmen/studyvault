import { AcademicStructureTree } from '../types/structure';

export const isTauri = typeof window !== 'undefined' && Boolean(
  (window as any).__TAURI__ ||
  (window as any).__TAURI_IPC__ ||
  (window as any).__TAURI_METADATA__ ||
  window.location.protocol.startsWith('tauri') ||
  window.location.protocol.startsWith('asset')
);

export interface LocalEcueFile {
  name: string;
  path: string;
  size?: number;
  extension: string;
}

/**
 * Assainit un nom pour qu'il soit un nom de dossier Windows/macOS valide.
 * Remplace /\:*?"<>| par un tiret -
 */
export function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '-').trim();
}

export function buildUeFolderName(code?: string | null, title?: string): string {
  const cleanTitle = sanitizeName(title || 'UE');
  const cleanCode = code ? sanitizeName(code) : '';
  return cleanCode ? `${cleanCode} - ${cleanTitle}` : cleanTitle;
}

export function buildEcueFolderName(code?: string | null, title?: string): string {
  const cleanTitle = sanitizeName(title || 'ECUE');
  const cleanCode = code ? sanitizeName(code) : '';
  return cleanCode ? `${cleanCode} - ${cleanTitle}` : cleanTitle;
}

export function buildEcueFolderPath(
  baseOrDocDir: string,
  semNumber: number,
  ueCode?: string | null,
  ueTitle?: string,
  ecueCode?: string | null,
  ecueTitle?: string
): string {
  const sep = baseOrDocDir.includes('\\') ? '\\' : '/';
  const custom = typeof window !== 'undefined' ? localStorage.getItem('studyvault_custom_root_dir') : null;
  let root = custom;
  if (!root) {
    root = baseOrDocDir.endsWith('StudyVault') || baseOrDocDir.endsWith('StudyVault/') || baseOrDocDir.endsWith('StudyVault\\')
      ? baseOrDocDir
      : (baseOrDocDir.endsWith(sep) ? `${baseOrDocDir}StudyVault` : `${baseOrDocDir}${sep}StudyVault`);
  }

  const semFolder = `Semestre ${semNumber}`;
  const ueFolder = buildUeFolderName(ueCode, ueTitle);
  const ecueFolder = buildEcueFolderName(ecueCode, ecueTitle);

  return `${root}${sep}${semFolder}${sep}${ueFolder}${sep}${ecueFolder}`;
}

/**
 * Construit le nom du dossier racine "Année - Niveau - Filière".
 * Ex: "2025-2026 - M1 - Modélisation Statistique"
 */
export function buildYearFolderName(yearLabel?: string | null, level?: string | null, program?: string | null): string {
  const parts: string[] = [];
  if (yearLabel) parts.push(sanitizeName(yearLabel));
  if (level) parts.push(sanitizeName(level));
  if (program) parts.push(sanitizeName(program));
  return parts.length > 0 ? parts.join(' - ') : 'Mon parcours';
}

/**
 * Construit le chemin complet vers le dossier racine d'une année universitaire.
 */
export function buildYearFolderPath(
  baseOrDocDir: string,
  yearLabel?: string | null,
  level?: string | null,
  program?: string | null
): string {
  const sep = baseOrDocDir.includes('\\') ? '\\' : '/';
  const custom = typeof window !== 'undefined' ? localStorage.getItem('studyvault_custom_root_dir') : null;
  let root = custom;
  if (!root) {
    root = baseOrDocDir.endsWith('StudyVault') || baseOrDocDir.endsWith('StudyVault/') || baseOrDocDir.endsWith('StudyVault\\')
      ? baseOrDocDir
      : (baseOrDocDir.endsWith(sep) ? `${baseOrDocDir}StudyVault` : `${baseOrDocDir}${sep}StudyVault`);
  }
  return `${root}${sep}${buildYearFolderName(yearLabel, level, program)}`;
}

/**
 * Construit le chemin complet vers le dossier d'une matière (Subject) en suivant
 * la hiérarchie : [Année - Niveau - Filière] / [UE] / [ECUE] / [Subject]
 */
export function buildSubjectFolderPath(
  baseOrDocDir: string,
  yearLabel: string | null | undefined,
  level: string | null | undefined,
  program: string | null | undefined,
  ueCode: string | null | undefined,
  ueTitle: string,
  ecueCode: string | null | undefined,
  ecueTitle: string,
  subjectName: string
): string {
  const sep = baseOrDocDir.includes('\\') ? '\\' : '/';
  const yearPath = buildYearFolderPath(baseOrDocDir, yearLabel, level, program);
  const ueFolder = buildUeFolderName(ueCode, ueTitle);
  const ecueFolder = buildEcueFolderName(ecueCode, ecueTitle);
  const subjectFolder = sanitizeName(subjectName);
  return `${yearPath}${sep}${ueFolder}${sep}${ecueFolder}${sep}${subjectFolder}`;
}

/**
 * Catégories de documents par défaut (CM, TD, TP, Examen, Sujets).
 */
export const DEFAULT_DOC_CATEGORIES = ['CM', 'TD', 'TP', 'Examen', 'Sujets'] as const;

/**
 * Crée les sous-dossiers CM/TD/TP/Examen/Sujets à l'intérieur d'un dossier de matière.
 */
export async function ensureSubjectCategoryFolders(subjectFolderPath: string): Promise<string[]> {
  if (!isTauri) return [];
  const created: string[] = [];
  try {
    const { createDir, exists } = await import('@tauri-apps/api/fs');
    const sep = subjectFolderPath.includes('\\') ? '\\' : '/';
    for (const cat of DEFAULT_DOC_CATEGORIES) {
      const catPath = `${subjectFolderPath}${sep}${cat}`;
      if (!(await exists(catPath))) {
        await createDir(catPath, { recursive: true });
        created.push(catPath);
      }
    }
  } catch (err) {
    console.error('FileOrganizer ensureSubjectCategoryFolders error:', err);
  }
  return created;
}

/**
 * Définit un dossier racine personnalisé choisi par l'utilisateur.
 */
export function setCustomRootPath(path: string | null) {
  if (typeof window === 'undefined') return;
  if (path) {
    localStorage.setItem('studyvault_custom_root_dir', path);
  } else {
    localStorage.removeItem('studyvault_custom_root_dir');
  }
}

/**
 * Permet à l'utilisateur de choisir un dossier de destination personnalisé sur son PC via le sélecteur OS.
 */
export async function pickCustomRootFolder(): Promise<string | null> {
  if (!isTauri) return null;

  try {
    const { open: openDialog } = await import('@tauri-apps/api/dialog');
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: 'Choisir le dossier où créer vos cours et documents StudyVault',
    });

    if (selected && typeof selected === 'string') {
      setCustomRootPath(selected);
      console.log(`[fileOrganizer] Nouveau dossier racine personnalisé : ${selected}`);
      return selected;
    }
    return null;
  } catch (err) {
    console.error('FileOrganizer pickCustomRootFolder error:', err);
    return null;
  }
}

/**
 * Retourne le chemin racine du dossier miroir (personnalisé si configuré, sinon documentDir()/StudyVault).
 * Logue automatiquement dans la console au démarrage.
 */
export async function getRootPath(): Promise<string> {
  const custom = typeof window !== 'undefined' ? localStorage.getItem('studyvault_custom_root_dir') : null;
  if (custom) {
    return custom;
  }

  if (!isTauri) return 'C:\\Users\\DELL\\Documents\\StudyVault';

  try {
    const { documentDir } = await import('@tauri-apps/api/path');
    const docDir = await documentDir();
    const sep = docDir.includes('\\') ? '\\' : '/';
    const rootPath = docDir.endsWith(sep) ? `${docDir}StudyVault` : `${docDir}${sep}StudyVault`;
    console.log(`[fileOrganizer] Base : ${rootPath}`);
    return rootPath;
  } catch (err) {
    console.error('FileOrganizer getRootPath error:', err);
    return 'C:\\Users\\DELL\\Documents\\StudyVault';
  }
}

/**
 * Résout le chemin absolu du dossier d'un compartiment.
 */
export async function resolveCategoryPath(
  semNumber: number,
  ueCode: string | null | undefined,
  ueTitle: string | undefined,
  ecueCode: string | null | undefined,
  ecueTitle: string | undefined,
  categoryName?: string
): Promise<string> {
  const docDir = isTauri
    ? await (await import('@tauri-apps/api/path')).documentDir()
    : 'C:\\Users\\DELL\\Documents';

  let folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
  if (categoryName) {
    const sep = folderPath.includes('\\') ? '\\' : '/';
    folderPath = `${folderPath}${sep}${sanitizeName(categoryName)}`;
  }
  return folderPath;
}

export async function openFolderByPath(folderPath: string): Promise<boolean> {
  if (!isTauri) return false;

  try {
    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      await invoke('open_system_folder', { path: folderPath });
      return true;
    } catch (_invokeErr) {
      const { open } = await import('@tauri-apps/api/shell');
      const { createDir, exists } = await import('@tauri-apps/api/fs');

      if (!(await exists(folderPath))) {
        await createDir(folderPath, { recursive: true });
      }

      await open(folderPath);
      return true;
    }
  } catch (err) {
    console.error('FileOrganizer openFolderByPath error:', err);
    return false;
  }
}

// Loguer le chemin de base au démarrage de l'application
if (isTauri) {
  getRootPath().catch(() => {});
}

/**
 * Synchronise l'arborescence locale dans Documents/StudyVault/
 * v1.2.43 : nouvelle hiérarchie [Année - Niveau - Filière] / UE / ECUE / Subject / {CM, TD, TP, Examen, Sujets}
 */
export async function syncStructure(tree: AcademicStructureTree): Promise<string | null> {
  if (!isTauri) return null;

  try {
    const rootPath = await getRootPath();
    const docDir = await (await import('@tauri-apps/api/path')).documentDir();
    const { createDir, exists } = await import('@tauri-apps/api/fs');
    const sep = docDir.includes('\\') ? '\\' : '/';

    if (!(await exists(rootPath))) {
      await createDir(rootPath, { recursive: true });
    }

    if (tree && Array.isArray(tree.semesters)) {
      // Récupérer le label d'année (ex "2025-2026") depuis la première UE/Semestre si dispo
      const yearLabel = tree.academicYearLabel;
      const level = tree.level;

      // Dossier racine "Année - Niveau - Filière" (la filière vient du profil académique de l'utilisateur)
      // tree.program n'existe pas dans la structure académique, on utilise un placeholder
      // On tente d'extraire la filière depuis le label de semestre
      const program = tree.semesters[0]?.label?.replace(/^S\d+\s*[-–]\s*/i, '').trim() || null;

      const yearFolderName = buildYearFolderName(yearLabel, level, program);
      const yearPath = `${rootPath}${sep}${yearFolderName}`;

      if (!(await exists(yearPath))) {
        await createDir(yearPath, { recursive: true });
      }

      for (const sem of tree.semesters) {
        for (const ue of sem.ues) {
          const ueFolderName = buildUeFolderName(ue.code, ue.title);
          const uePath = `${yearPath}${sep}${ueFolderName}`;
          if (!(await exists(uePath))) {
            await createDir(uePath, { recursive: true });
          }

          for (const ecue of ue.ecues) {
            const ecueFolderName = buildEcueFolderName(ecue.code, ecue.title);
            const ecuePath = `${uePath}${sep}${ecueFolderName}`;
            if (!(await exists(ecuePath))) {
              await createDir(ecuePath, { recursive: true });
            }

            // Pour chaque matière (Subject), créer le dossier + les sous-dossiers CM/TD/TP/Examen/Sujets
            const allSubjects = [
              ...(ecue.subjects || []),
              ...(ue.directSubjects || []).filter(s => !ecue.subjects?.some(es => es.id === s.id)),
            ];

            for (const subject of allSubjects) {
              if (!subject?.name) continue;
              const subjectFolderName = sanitizeName(subject.name);
              const subjectPath = `${ecuePath}${sep}${subjectFolderName}`;
              if (!(await exists(subjectPath))) {
                await createDir(subjectPath, { recursive: true });
              }
              // Créer les sous-dossiers de catégories
              for (const cat of DEFAULT_DOC_CATEGORIES) {
                const catPath = `${subjectPath}${sep}${cat}`;
                if (!(await exists(catPath))) {
                  await createDir(catPath, { recursive: true });
                }
              }
            }
          }
        }
      }
    }

    return rootPath;
  } catch (err) {
    console.error('FileOrganizer syncStructure error:', err);
    return null;
  }
}

/**
 * Assure la création du dossier d'une ECUE dès la création de l'UE/ECUE ou au chargement.
 */
export async function ensureEcueFolder(
  semNumber: number,
  ueCode?: string | null,
  ueTitle?: string,
  ecueCode?: string | null,
  ecueTitle?: string
): Promise<string | null> {
  if (!isTauri) return null;

  try {
    const docDir = await getRootPath();
    const folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);

    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      await invoke('create_local_folder', { path: folderPath });
      return folderPath;
    } catch (_invokeErr) {
      const { createDir, exists } = await import('@tauri-apps/api/fs');
      if (!(await exists(folderPath))) {
        await createDir(folderPath, { recursive: true });
      }
      return folderPath;
    }
  } catch (err) {
    console.error('FileOrganizer ensureEcueFolder error:', err);
    return null;
  }
}

/**
 * Liste les documents présents dans le dossier local d'une ECUE (scanné de façon récursive).
 */
export async function listEcueDocuments(
  semNumber: number,
  ueCode?: string | null,
  ueTitle?: string,
  ecueCode?: string | null,
  ecueTitle?: string
): Promise<LocalEcueFile[]> {
  if (!isTauri) return [];

  try {
    const docDir = await getRootPath();
    const folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);

    const { readDir, exists } = await import('@tauri-apps/api/fs');

    if (!(await exists(folderPath))) {
      return [];
    }

    const files: LocalEcueFile[] = [];

    const processEntries = async (entriesArr: any[]) => {
      for (const entry of entriesArr) {
        if (entry.children && Array.isArray(entry.children)) {
          await processEntries(entry.children);
        } else if (entry.name && entry.path) {
          const ext = entry.name.includes('.') ? entry.name.split('.').pop()?.toLowerCase() || '' : '';
          files.push({
            name: entry.name,
            path: entry.path,
            extension: ext,
          });
        }
      }
    };

    try {
      const topEntries = await readDir(folderPath, { recursive: true });
      await processEntries(topEntries);
    } catch (_e) {
      const topEntries = await readDir(folderPath);
      await processEntries(topEntries);
    }

    return files;
  } catch (err) {
    console.error('FileOrganizer listEcueDocuments error:', err);
    return [];
  }
}

/**
 * Permet à l'utilisateur d'ajouter des fichiers directement dans le dossier ECUE (sans sous-dossiers).
 */
export async function addEcueDocuments(
  semNumber: number,
  ueCode?: string | null,
  ueTitle?: string,
  ecueCode?: string | null,
  ecueTitle?: string
): Promise<{ files: LocalEcueFile[]; copiedPaths: string[] }> {
  if (!isTauri) return { files: [], copiedPaths: [] };

  try {
    const { open: openDialog } = await import('@tauri-apps/api/dialog');
    const { copyFile, createDir, exists } = await import('@tauri-apps/api/fs');

    const selected = await openDialog({
      multiple: true,
      title: 'Sélectionner des documents pour cette ECUE',
    });

    if (!selected) {
      const currentFiles = await listEcueDocuments(semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
      return { files: currentFiles, copiedPaths: [] };
    }

    const filePaths = Array.isArray(selected) ? selected : [selected];
    if (filePaths.length === 0) {
      const currentFiles = await listEcueDocuments(semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
      return { files: currentFiles, copiedPaths: [] };
    }

    const docDir = await getRootPath();
    const folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);

    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      await invoke('create_local_folder', { path: folderPath });
    } catch (_invokeErr) {
      if (!(await exists(folderPath))) {
        await createDir(folderPath, { recursive: true });
      }
    }

    const sep = folderPath.includes('\\') ? '\\' : '/';
    const copiedPaths: string[] = [];

    for (const sourcePath of filePaths) {
      const fileName = sourcePath.split(/[/\\]/).pop() || 'document';
      const destPath = `${folderPath}${sep}${fileName}`;
      await copyFile(sourcePath, destPath);
      copiedPaths.push(destPath);
    }

    const updatedFiles = await listEcueDocuments(semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
    return { files: updatedFiles, copiedPaths };
  } catch (err) {
    console.error('FileOrganizer addEcueDocuments error:', err);
    return { files: [], copiedPaths: [] };
  }
}

/**
 * Ouvre un fichier avec le programme système par défaut.
 */
export async function openDocumentFile(filePath: string): Promise<boolean> {
  if (!isTauri) return false;

  try {
    const { open } = await import('@tauri-apps/api/shell');
    await open(filePath);
    return true;
  } catch (err) {
    console.error('FileOrganizer openDocumentFile error:', err);
    return false;
  }
}

/**
 * Ouvre le dossier ECUE dans l'explorateur de fichiers OS.
 */
export async function openEcueFolder(
  semNumber: number,
  ueCode?: string | null,
  ueTitle?: string,
  ecueCode?: string | null,
  ecueTitle?: string,
  categoryName?: string
): Promise<boolean> {
  if (!isTauri) return false;

  try {
    const docDir = await getRootPath();
    let folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);

    if (categoryName) {
      const sep = folderPath.includes('\\') ? '\\' : '/';
      folderPath = `${folderPath}${sep}${sanitizeName(categoryName)}`;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/tauri');
      await invoke('create_local_folder', { path: folderPath });
      await invoke('open_system_folder', { path: folderPath });
      return true;
    } catch (_invokeErr) {
      const { open } = await import('@tauri-apps/api/shell');
      const { createDir, exists } = await import('@tauri-apps/api/fs');

      if (!(await exists(folderPath))) {
        await createDir(folderPath, { recursive: true });
      }

      await open(folderPath);
      return true;
    }
  } catch (err) {
    console.error('FileOrganizer openEcueFolder error:', err);
    return false;
  }
}

/**
 * Assure la présence du dossier de compartiment dans l'arborescence locale.
 */
export async function ensureCategoryFolder(
  semNumber: number,
  ueCode: string | null | undefined,
  ueTitle: string | undefined,
  ecueCode: string | null | undefined,
  ecueTitle: string | undefined,
  categoryName: string
): Promise<string | null> {
  if (!isTauri) return null;

  try {
    const { documentDir } = await import('@tauri-apps/api/path');
    const { createDir, exists } = await import('@tauri-apps/api/fs');

    const docDir = await documentDir();
    const ecuePath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
    const sep = ecuePath.includes('\\') ? '\\' : '/';
    const catPath = `${ecuePath}${sep}${sanitizeName(categoryName)}`;

    if (!(await exists(catPath))) {
      await createDir(catPath, { recursive: true });
    }

    return catPath;
  } catch (err) {
    console.error('FileOrganizer ensureCategoryFolder error:', err);
    return null;
  }
}

/**
 * Renomme un dossier de compartiment sur le disque.
 */
export async function renameCategoryFolder(
  semNumber: number,
  ueCode: string | null | undefined,
  ueTitle: string | undefined,
  ecueCode: string | null | undefined,
  ecueTitle: string | undefined,
  oldName: string,
  newName: string
): Promise<boolean> {
  if (!isTauri) return false;

  try {
    const { documentDir } = await import('@tauri-apps/api/path');
    const { renameFile, exists } = await import('@tauri-apps/api/fs');

    const docDir = await documentDir();
    const ecuePath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
    const sep = ecuePath.includes('\\') ? '\\' : '/';

    const oldPath = `${ecuePath}${sep}${sanitizeName(oldName)}`;
    const newPath = `${ecuePath}${sep}${sanitizeName(newName)}`;

    if (await exists(oldPath)) {
      await renameFile(oldPath, newPath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('FileOrganizer renameCategoryFolder error:', err);
    return false;
  }
}

// =====================================================================
// v1.2.43 — Nouvelle structure [Année - Niveau - Filière] / UE / ECUE / Subject
// =====================================================================

export interface SubjectFolderStats {
  total: number;
  byCategory: Record<string, number>;
}

/**
 * Compte le nombre de fichiers dans un dossier (récursivement).
 * Utilise readDir de Tauri pour scanner le système de fichiers local.
 */
export async function countFilesRecursive(folderPath: string): Promise<number> {
  if (!isTauri) return 0;
  try {
    const { readDir, exists } = await import('@tauri-apps/api/fs');
    if (!(await exists(folderPath))) return 0;
    let count = 0;
    const stack: string[] = [folderPath];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const entries = await readDir(current);
      for (const entry of entries) {
        if (entry.children && Array.isArray(entry.children)) {
          stack.push(entry.path);
        } else if (entry.name) {
          // C'est un fichier (pas un dossier)
          count++;
        }
      }
    }
    return count;
  } catch (err) {
    console.error('FileOrganizer countFilesRecursive error:', err);
    return 0;
  }
}

/**
 * Récupère les statistiques complètes d'un dossier de matière :
 * nombre total de fichiers + répartition par catégorie (CM, TD, TP, Examen, Sujets).
 */
export async function getSubjectFolderStats(
  yearLabel: string | null | undefined,
  level: string | null | undefined,
  program: string | null | undefined,
  ueCode: string | null | undefined,
  ueTitle: string,
  ecueCode: string | null | undefined,
  ecueTitle: string,
  subjectName: string
): Promise<SubjectFolderStats> {
  const empty: SubjectFolderStats = { total: 0, byCategory: {} };
  if (!isTauri) return empty;

  try {
    const { exists } = await import('@tauri-apps/api/fs');
    const docDir = await (await import('@tauri-apps/api/path')).documentDir();
    const subjectPath = buildSubjectFolderPath(
      docDir, yearLabel, level, program,
      ueCode, ueTitle, ecueCode, ecueTitle, subjectName
    );

    if (!(await exists(subjectPath))) return empty;

    const byCategory: Record<string, number> = {};
    let total = 0;
    const sep = subjectPath.includes('\\') ? '\\' : '/';

    // Pour chaque catégorie par défaut, compter les fichiers
    for (const cat of DEFAULT_DOC_CATEGORIES) {
      const catPath = `${subjectPath}${sep}${cat}`;
      if (await exists(catPath)) {
        const n = await countFilesRecursive(catPath);
        byCategory[cat] = n;
        total += n;
      } else {
        byCategory[cat] = 0;
      }
    }

    // Compter aussi les fichiers directement à la racine du sujet (catégorie "Autre")
    const rootFiles = await countFilesRecursive(subjectPath);
    const rootDirect = rootFiles - total;
    if (rootDirect > 0) {
      byCategory['Autre'] = rootDirect;
      total += rootDirect;
    }

    return { total, byCategory };
  } catch (err) {
    console.error('FileOrganizer getSubjectFolderStats error:', err);
    return empty;
  }
}

/**
 * Ouvre la boîte de dialogue système pour sélectionner des fichiers,
 * puis les copie dans le dossier d'une matière spécifique.
 * Si category est fourni, les fichiers vont dans [subjectPath]/[category].
 * Sinon, ils vont à la racine du sujet.
 */
export async function addSubjectDocuments(
  yearLabel: string | null | undefined,
  level: string | null | undefined,
  program: string | null | undefined,
  ueCode: string | null | undefined,
  ueTitle: string,
  ecueCode: string | null | undefined,
  ecueTitle: string,
  subjectName: string,
  category?: string
): Promise<{ fileNames: string[]; destPaths: string[] }> {
  if (!isTauri) return { fileNames: [], destPaths: [] };

  try {
    const { open: openDialog } = await import('@tauri-apps/api/dialog');
    const { copyFile, createDir, exists } = await import('@tauri-apps/api/fs');
    const docDir = await (await import('@tauri-apps/api/path')).documentDir();

    const selected = await openDialog({
      multiple: true,
      title: `Ajouter des documents — ${subjectName}${category ? ` (${category})` : ''}`,
    });

    if (!selected) return { fileNames: [], destPaths: [] };

    const filePaths = Array.isArray(selected) ? selected : [selected];
    if (filePaths.length === 0) return { fileNames: [], destPaths: [] };

    let subjectPath = buildSubjectFolderPath(
      docDir, yearLabel, level, program,
      ueCode, ueTitle, ecueCode, ecueTitle, subjectName
    );

    const sep = subjectPath.includes('\\') ? '\\' : '/';
    if (category) {
      subjectPath = `${subjectPath}${sep}${sanitizeName(category)}`;
    }

    // Crée le dossier s'il n'existe pas
    if (!(await exists(subjectPath))) {
      await createDir(subjectPath, { recursive: true });
    }

    const fileNames: string[] = [];
    const destPaths: string[] = [];
    for (const sourcePath of filePaths) {
      const fileName = sourcePath.split(/[/\\]/).pop() || 'document';
      const destPath = `${subjectPath}${sep}${fileName}`;
      await copyFile(sourcePath, destPath);
      fileNames.push(fileName);
      destPaths.push(destPath);
    }

    return { fileNames, destPaths };
  } catch (err) {
    console.error('FileOrganizer addSubjectDocuments error:', err);
    return { fileNames: [], destPaths: [] };
  }
}

/**
 * Ouvre le dossier d'une matière dans l'explorateur de fichiers système.
 */
export async function openSubjectFolder(
  yearLabel: string | null | undefined,
  level: string | null | undefined,
  program: string | null | undefined,
  ueCode: string | null | undefined,
  ueTitle: string,
  ecueCode: string | null | undefined,
  ecueTitle: string,
  subjectName: string,
  category?: string
): Promise<boolean> {
  if (!isTauri) return false;

  try {
    const { createDir, exists } = await import('@tauri-apps/api/fs');
    const { invoke } = await import('@tauri-apps/api/tauri');
    const docDir = await (await import('@tauri-apps/api/path')).documentDir();

    let subjectPath = buildSubjectFolderPath(
      docDir, yearLabel, level, program,
      ueCode, ueTitle, ecueCode, ecueTitle, subjectName
    );
    const sep = subjectPath.includes('\\') ? '\\' : '/';
    if (category) {
      subjectPath = `${subjectPath}${sep}${sanitizeName(category)}`;
    }

    // Crée le dossier racine de la matière (et les catégories) s'il n'existe pas
    await ensureSubjectCategoryFolders(
      buildSubjectFolderPath(
        docDir, yearLabel, level, program,
        ueCode, ueTitle, ecueCode, ecueTitle, subjectName
      )
    );

    if (!(await exists(subjectPath))) {
      await createDir(subjectPath, { recursive: true });
    }

    await invoke('open_system_folder', { path: subjectPath });
    return true;
  } catch (err) {
    console.error('FileOrganizer openSubjectFolder error:', err);
    return false;
  }
}

/**
 * Copie un ou plusieurs fichiers externes vers le dossier du compartiment.
 */
export async function copyFilesToCategoryFolder(
  sourcePaths: string[],
  semNumber: number,
  ueCode: string | null | undefined,
  ueTitle: string | undefined,
  ecueCode: string | null | undefined,
  ecueTitle: string | undefined,
  categoryName?: string
): Promise<{ fileName: string; destPath: string }[]> {
  if (!isTauri || sourcePaths.length === 0) return [];

  try {
    const { documentDir } = await import('@tauri-apps/api/path');
    const { copyFile, createDir, exists } = await import('@tauri-apps/api/fs');

    const docDir = await documentDir();
    let folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
    const sep = folderPath.includes('\\') ? '\\' : '/';

    if (categoryName) {
      folderPath = `${folderPath}${sep}${sanitizeName(categoryName)}`;
    }

    if (!(await exists(folderPath))) {
      await createDir(folderPath, { recursive: true });
    }

    const copied: { fileName: string; destPath: string }[] = [];

    for (const src of sourcePaths) {
      const fileName = src.split(/[/\\]/).pop() || 'file';
      const destPath = `${folderPath}${sep}${fileName}`;
      await copyFile(src, destPath);
      copied.push({ fileName, destPath });
    }

    return copied;
  } catch (err) {
    console.error('FileOrganizer copyFilesToCategoryFolder error:', err);
    return [];
  }
}

/**
 * Déplace un fichier local d'un compartiment à un autre sur le disque.
 */
export async function moveFileBetweenCategories(
  fileName: string,
  semNumber: number,
  ueCode: string | null | undefined,
  ueTitle: string | undefined,
  ecueCode: string | null | undefined,
  ecueTitle: string | undefined,
  oldCategoryName?: string,
  newCategoryName?: string
): Promise<boolean> {
  if (!isTauri) return false;

  try {
    const { documentDir } = await import('@tauri-apps/api/path');
    const { renameFile, createDir, exists } = await import('@tauri-apps/api/fs');

    const docDir = await documentDir();
    const ecuePath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
    const sep = ecuePath.includes('\\') ? '\\' : '/';

    const sourceDir = oldCategoryName ? `${ecuePath}${sep}${sanitizeName(oldCategoryName)}` : ecuePath;
    const targetDir = newCategoryName ? `${ecuePath}${sep}${sanitizeName(newCategoryName)}` : ecuePath;

    if (!(await exists(targetDir))) {
      await createDir(targetDir, { recursive: true });
    }

    const sourceFilePath = `${sourceDir}${sep}${fileName}`;
    const targetFilePath = `${targetDir}${sep}${fileName}`;

    if (await exists(sourceFilePath)) {
      await renameFile(sourceFilePath, targetFilePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('FileOrganizer moveFileBetweenCategories error:', err);
    return false;
  }
}
