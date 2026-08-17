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
  docDir: string,
  semNumber: number,
  ueCode?: string | null,
  ueTitle?: string,
  ecueCode?: string | null,
  ecueTitle?: string
): string {
  const sep = docDir.includes('\\') ? '\\' : '/';
  const root = docDir.endsWith(sep) ? `${docDir}StudyVault` : `${docDir}${sep}StudyVault`;
  const semFolder = `Semestre ${semNumber}`;
  const ueFolder = buildUeFolderName(ueCode, ueTitle);
  const ecueFolder = buildEcueFolderName(ecueCode, ecueTitle);

  return `${root}${sep}${semFolder}${sep}${ueFolder}${sep}${ecueFolder}`;
}

/**
 * Synchronise l'arborescence locale dans Documents/StudyVault/
 */
export async function syncStructure(tree: AcademicStructureTree): Promise<string | null> {
  if (!isTauri) return null;

  try {
    const { documentDir } = await import('@tauri-apps/api/path');
    const { createDir, exists } = await import('@tauri-apps/api/fs');

    const docDir = await documentDir();
    const sep = docDir.includes('\\') ? '\\' : '/';
    const rootPath = docDir.endsWith(sep) ? `${docDir}StudyVault` : `${docDir}${sep}StudyVault`;

    if (!(await exists(rootPath))) {
      await createDir(rootPath, { recursive: true });
    }

    if (tree && Array.isArray(tree.semesters)) {
      for (const sem of tree.semesters) {
        const semPath = `${rootPath}${sep}Semestre ${sem.number}`;
        if (!(await exists(semPath))) {
          await createDir(semPath, { recursive: true });
        }

        for (const ue of sem.ues) {
          const ueFolderName = buildUeFolderName(ue.code, ue.title);
          const uePath = `${semPath}${sep}${ueFolderName}`;
          if (!(await exists(uePath))) {
            await createDir(uePath, { recursive: true });
          }

          for (const ecue of ue.ecues) {
            const ecueFolderName = buildEcueFolderName(ecue.code, ecue.title);
            const ecuePath = `${uePath}${sep}${ecueFolderName}`;
            if (!(await exists(ecuePath))) {
              await createDir(ecuePath, { recursive: true });
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
 * Liste les documents présents dans le dossier local d'une ECUE.
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
    const { documentDir } = await import('@tauri-apps/api/path');
    const { readDir, exists } = await import('@tauri-apps/api/fs');

    const docDir = await documentDir();
    const folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);

    if (!(await exists(folderPath))) {
      return [];
    }

    const entries = await readDir(folderPath);
    const files: LocalEcueFile[] = [];

    for (const entry of entries) {
      if (entry.name && !entry.children) {
        const ext = entry.name.includes('.') ? entry.name.split('.').pop()?.toLowerCase() || '' : '';
        files.push({
          name: entry.name,
          path: entry.path,
          extension: ext,
        });
      }
    }

    return files;
  } catch (err) {
    console.error('FileOrganizer listEcueDocuments error:', err);
    return [];
  }
}

/**
 * Permet à l'utilisateur d'ajouter un ou plusieurs fichiers dans le dossier ECUE.
 */
export async function addEcueDocuments(
  semNumber: number,
  ueCode?: string | null,
  ueTitle?: string,
  ecueCode?: string | null,
  ecueTitle?: string
): Promise<LocalEcueFile[]> {
  if (!isTauri) return [];

  try {
    const { open: openDialog } = await import('@tauri-apps/api/dialog');
    const { documentDir } = await import('@tauri-apps/api/path');
    const { copyFile, createDir, exists } = await import('@tauri-apps/api/fs');

    const selected = await openDialog({
      multiple: true,
      title: 'Sélectionner des documents pour cette ECUE',
    });

    if (!selected) return [];

    const filePaths = Array.isArray(selected) ? selected : [selected];
    if (filePaths.length === 0) return [];

    const docDir = await documentDir();
    const folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);

    if (!(await exists(folderPath))) {
      await createDir(folderPath, { recursive: true });
    }

    const sep = folderPath.includes('\\') ? '\\' : '/';

    for (const sourcePath of filePaths) {
      const fileName = sourcePath.split(/[/\\]/).pop() || 'document';
      const destPath = `${folderPath}${sep}${fileName}`;
      await copyFile(sourcePath, destPath);
    }

    return await listEcueDocuments(semNumber, ueCode, ueTitle, ecueCode, ecueTitle);
  } catch (err) {
    console.error('FileOrganizer addEcueDocuments error:', err);
    return [];
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
    const { documentDir } = await import('@tauri-apps/api/path');
    const { open } = await import('@tauri-apps/api/shell');
    const { createDir, exists } = await import('@tauri-apps/api/fs');

    const docDir = await documentDir();
    let folderPath = buildEcueFolderPath(docDir, semNumber, ueCode, ueTitle, ecueCode, ecueTitle);

    if (categoryName) {
      const sep = folderPath.includes('\\') ? '\\' : '/';
      folderPath = `${folderPath}${sep}${sanitizeName(categoryName)}`;
    }

    if (!(await exists(folderPath))) {
      await createDir(folderPath, { recursive: true });
    }

    await open(folderPath);
    return true;
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
