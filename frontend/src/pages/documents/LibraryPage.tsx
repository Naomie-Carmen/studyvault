import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AcademicStructureTree, ECUE } from '../../types/structure';
import { DocumentItem, DocumentCategoryItem } from '../../types/document';
import * as structureService from '../../services/academicStructureService';
import * as docService from '../../services/documentService';
import * as fileOrganizer from '../../services/fileOrganizer';
import { FilePreviewModal } from '../../components/documents/FilePreviewModal';
import { 
  Library, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Folder, 
  FolderOpen, 
  FileText, 
  File as FileGenericIcon, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Film, 
  Trash2, 
  ExternalLink,
  UploadCloud,
  Info,
  CheckCircle2
} from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const { t } = useTranslation();
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUeIds, setExpandedUeIds] = useState<Record<string, boolean>>({});

  // Selected ECUE state
  const [selectedEcue, setSelectedEcue] = useState<{
    ecue: ECUE;
    ueCode?: string | null;
    ueTitle?: string;
    semNumber: number;
  } | null>(null);

  // Categories and documents for selected ECUE
  const [categories, setCategories] = useState<DocumentCategoryItem[]>([]);
  const [ecueDocs, setEcueDocs] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Add category modal / inline form
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Drag over category state (green highlight) & active ref for zoneSurvolee
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const activeZoneRef = useRef<DocumentCategoryItem | null>(null);
  const activeEcueRef = useRef(selectedEcue);

  // Document preview modal state
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentItem | null>(null);

  // Toast feedback state
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    activeEcueRef.current = selectedEcue;
  }, [selectedEcue]);

  const loadStructureTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await structureService.getStructureTree();
      if (res.success && res.data) {
        setTree(res.data);
        // Auto-select first ECUE if available
        for (const sem of res.data.semesters) {
          for (const ue of sem.ues) {
            if (ue.ecues && ue.ecues.length > 0) {
              setSelectedEcue({
                ecue: ue.ecues[0],
                ueCode: ue.code,
                ueTitle: ue.title,
                semNumber: sem.number,
              });
              setExpandedUeIds({ [ue.id]: true });
              return;
            }
          }
        }
      }
    } catch (_e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStructureTree();
  }, [loadStructureTree]);

  // Fetch categories and documents whenever selected ECUE changes
  const fetchEcueData = useCallback(async () => {
    if (!selectedEcue) return;
    setLoadingDocs(true);
    try {
      const [catRes, docRes] = await Promise.all([
        docService.getCategories(selectedEcue.ecue.id),
        docService.getDocuments({ ecueId: selectedEcue.ecue.id }),
      ]);

      if (catRes.success && catRes.data) {
        setCategories(catRes.data);
        if (fileOrganizer.isTauri) {
          for (const cat of catRes.data) {
            fileOrganizer.ensureCategoryFolder(
              selectedEcue.semNumber,
              selectedEcue.ueCode,
              selectedEcue.ueTitle,
              selectedEcue.ecue.code,
              selectedEcue.ecue.title,
              cat.name
            ).catch(() => {});
          }
        }
      }

      if (docRes.success && docRes.data) {
        setEcueDocs(docRes.data);
      }
    } catch (_e) {
      /* ignore */
    } finally {
      setLoadingDocs(false);
    }
  }, [selectedEcue]);

  useEffect(() => {
    fetchEcueData();
  }, [fetchEcueData]);

  const getMimeTypeFromExt = (ext: string) => {
    const map: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      zip: 'application/zip',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  };

  // Process file import from local paths (Desktop Tauri)
  const importFilePathsToCategory = useCallback(async (paths: string[], targetCat: DocumentCategoryItem | null) => {
    const currentEcue = activeEcueRef.current;
    if (!currentEcue || paths.length === 0) return;

    if (fileOrganizer.isTauri) {
      await fileOrganizer.copyFilesToCategoryFolder(
        paths,
        currentEcue.semNumber,
        currentEcue.ueCode,
        currentEcue.ueTitle,
        currentEcue.ecue.code,
        currentEcue.ecue.title,
        targetCat?.name
      );
    }

    try {
      const formData = new FormData();
      formData.append('ecueId', currentEcue.ecue.id);
      if (targetCat) formData.append('categoryId', targetCat.id);

      if (fileOrganizer.isTauri) {
        const { readBinaryFile } = await import('@tauri-apps/api/fs');
        for (const p of paths) {
          const fileName = p.split(/[/\\]/).pop() || 'document';
          const ext = fileName.split('.').pop() || '';
          try {
            const contents = await readBinaryFile(p);
            const blob = new Blob([new Uint8Array(contents)], { type: getMimeTypeFromExt(ext) });
            const file = new File([blob], fileName, { type: getMimeTypeFromExt(ext) });
            formData.append('files', file);
          } catch (e) {
            console.error('Error reading binary file for upload:', p, e);
          }
        }
      }

      const res = await docService.uploadFiles(formData);
      if (res.success) {
        showToast(`${paths.length} fichier(s) ajouté(s) à ${targetCat ? targetCat.name : 'Non classé'}`);
      } else {
        showToast(`Erreur d'ajout : ${res.error?.message || 'Échec du téléversement'}`);
      }
    } catch (_err) {
      showToast('Erreur lors du téléversement du fichier.');
    } finally {
      fetchEcueData();
    }
  }, [fetchEcueData]);

  // Wire Tauri event listener for tauri://drag-drop / tauri://file-drop
  useEffect(() => {
    if (!fileOrganizer.isTauri) return;
    let unlisten: (() => void) | null = null;

    import('@tauri-apps/api/event').then(({ listen }) => {
      listen<{ paths: string[] }>('tauri://drag-drop', async (event) => {
        const paths = event.payload?.paths || (event.payload as any) || [];
        if (Array.isArray(paths) && paths.length > 0) {
          const targetCat = activeZoneRef.current;
          await importFilePathsToCategory(paths, targetCat);
          setDragOverCatId(null);
        }
      }).then((fn) => {
        unlisten = fn;
      });
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [importFilePathsToCategory]);

  const toggleUe = (ueId: string) => {
    setExpandedUeIds((prev) => ({ ...prev, [ueId]: !prev[ueId] }));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEcue || !newCatName.trim()) return;

    try {
      const res = await docService.createCategory(selectedEcue.ecue.id, newCatName.trim());
      if (res.success) {
        setNewCatName('');
        setShowAddCatModal(false);
        fetchEcueData();

        if (fileOrganizer.isTauri && res.data) {
          fileOrganizer.ensureCategoryFolder(
            selectedEcue.semNumber,
            selectedEcue.ueCode,
            selectedEcue.ueTitle,
            selectedEcue.ecue.code,
            selectedEcue.ecue.title,
            res.data.name
          );
        }
      }
    } catch (_err) {
      /* ignore */
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Supprimer le compartiment "${catName}" ? Ses documents passeront dans "Non classé".`)) return;
    try {
      const res = await docService.deleteCategory(catId);
      if (res.success) {
        fetchEcueData();
      }
    } catch (_err) {
      /* ignore */
    }
  };

  const handleOpenFolder = async (categoryName?: string) => {
    if (!selectedEcue) return;
    await fileOrganizer.openEcueFolder(
      selectedEcue.semNumber,
      selectedEcue.ueCode,
      selectedEcue.ueTitle,
      selectedEcue.ecue.code,
      selectedEcue.ecue.title,
      categoryName
    );
  };

  // Drag Internal Document Card to Category Drop-zone
  const handleDocDragStart = (e: React.DragEvent, doc: DocumentItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'internal-doc', docId: doc.id, oldCatId: doc.categoryId }));
  };

  const handleDragOverCategory = (e: React.DragEvent, catId: string | null, catObj: DocumentCategoryItem | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragOverCatId !== catId) {
      setDragOverCatId(catId);
      activeZoneRef.current = catObj;
    }
  };

  const handleDragLeaveCategory = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCatId(null);
  };

  const handleDropOnCategory = async (e: React.DragEvent, targetCat: DocumentCategoryItem | null) => {
    e.preventDefault();
    setDragOverCatId(null);
    if (!selectedEcue) return;

    const rawPayload = e.dataTransfer.getData('application/json');
    if (rawPayload) {
      try {
        const payload = JSON.parse(rawPayload);
        if (payload.type === 'internal-doc' && payload.docId) {
          const targetCatId = targetCat ? targetCat.id : null;
          if (payload.oldCatId === targetCatId) return;

          const docToMove = ecueDocs.find((d) => d.id === payload.docId);
          const oldCatObj = categories.find((c) => c.id === payload.oldCatId);

          const res = await docService.moveDocumentCategory(payload.docId, targetCatId);
          if (res.success) {
            fetchEcueData();

            if (fileOrganizer.isTauri && docToMove) {
              fileOrganizer.moveFileBetweenCategories(
                docToMove.originalName,
                selectedEcue.semNumber,
                selectedEcue.ueCode,
                selectedEcue.ueTitle,
                selectedEcue.ecue.code,
                selectedEcue.ecue.title,
                oldCatObj?.name,
                targetCat?.name
              );
            }
          }
          return;
        }
      } catch (_e) {
        /* ignore */
      }
    }

    // Drag & Drop External Files FROM Windows File Explorer (HTML5 files array)
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const formData = new FormData();
      formData.append('ecueId', selectedEcue.ecue.id);
      if (targetCat) formData.append('categoryId', targetCat.id);

      files.forEach((file) => formData.append('files', file));

      try {
        const uploadRes = await docService.uploadFiles(formData);
        if (uploadRes.success) {
          fetchEcueData();
          showToast(`${files.length} fichier(s) ajouté(s) à ${targetCat ? targetCat.name : 'Non classé'}`);

          if (fileOrganizer.isTauri) {
            const paths = files.map((f) => (f as any).path).filter(Boolean);
            if (paths.length > 0) {
              fileOrganizer.copyFilesToCategoryFolder(
                paths,
                selectedEcue.semNumber,
                selectedEcue.ueCode,
                selectedEcue.ueTitle,
                selectedEcue.ecue.code,
                selectedEcue.ecue.title,
                targetCat?.name
              );
            }
          }
        }
      } catch (_err) {
        /* ignore */
      }
    }
  };

  // Fallback Click Importer (opens native dialog on Desktop or input file on Web)
  const handleCategoryClickImport = async (targetCat: DocumentCategoryItem | null) => {
    if (!selectedEcue) return;

    if (fileOrganizer.isTauri) {
      try {
        const { open: openDialog } = await import('@tauri-apps/api/dialog');
        const selected = await openDialog({
          multiple: true,
          title: `Sélectionner des fichiers pour ${targetCat ? targetCat.name : 'Non classé'}`,
        });

        if (selected) {
          const paths = Array.isArray(selected) ? selected : [selected];
          if (paths.length > 0) {
            await importFilePathsToCategory(paths, targetCat);
            return;
          }
        }
        return;
      } catch (err) {
        console.warn('Tauri openDialog error, fallback to HTML file input:', err);
      }
    }

    // Web & Fallback HTML File Input
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files: File[] = Array.from(e.target.files || []);
      if (files.length > 0) {
        const formData = new FormData();
        formData.append('ecueId', selectedEcue.ecue.id);
        if (targetCat) formData.append('categoryId', targetCat.id);
        files.forEach((f) => formData.append('files', f));

        try {
          const res = await docService.uploadFiles(formData);
          if (res.success) {
            fetchEcueData();
            showToast(`${files.length} fichier(s) ajouté(s) à ${targetCat ? targetCat.name : 'Non classé'}`);
          } else {
            showToast(`Erreur d'ajout : ${res.error?.message || 'Échec'}`);
          }
        } catch (_err) {
          showToast('Erreur lors du téléversement.');
        }
      }
    };
    input.click();
  };

  const getDocIcon = (mimeType: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (mimeType.includes('pdf') || ext === 'pdf') return <FileText size={18} className="text-red-400" />;
    if (mimeType.includes('sheet') || ext === 'xlsx' || ext === 'csv') return <FileSpreadsheet size={18} className="text-emerald-400" />;
    if (mimeType.includes('image') || ['png', 'jpg', 'jpeg'].includes(ext)) return <ImageIcon size={18} className="text-purple-400" />;
    if (mimeType.includes('video') || ['mp4', 'avi'].includes(ext)) return <Film size={18} className="text-blue-400" />;
    return <FileGenericIcon size={18} className="text-indigo-400" />;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="library-page">
      {/* Toast Notification Banner */}
      {toastMsg && (
        <div className="toast-notification-banner glass-card">
          <CheckCircle2 size={18} className="text-emerald" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Page Header */}
      <div className="page-header glass-card">
        <div className="header-info">
          <div className="header-icon-circle">
            <Library size={24} />
          </div>
          <div>
            <h1>{t('library.title', 'Bibliothèque Académique')}</h1>
            <p className="subtitle">{t('library.subtitle', 'Rangement structuré des cours, TD et sujets par ECUE et compartiments.')}</p>
          </div>
        </div>

        {selectedEcue && (
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => handleOpenFolder()} title="Ouvrir dans l'explorateur OS">
              <FolderOpen size={16} />
              <span>{t('library.openFolderBtn', '📁 Ouvrir le dossier')}</span>
            </button>
            <button className="btn-primary" onClick={() => setShowAddCatModal(true)}>
              <Plus size={16} />
              <span>{t('library.addCategoryBtn', '+ Compartiment')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="library-layout">
        {/* Left Column: Academic Tree Navigation */}
        <div className="library-sidebar glass-card">
          <div className="sidebar-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder={t('library.searchPlaceholder', 'Rechercher une ECUE...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="tree-scroll">
            {loading ? (
              <div className="sidebar-loading">Chargement des ECUEs...</div>
            ) : !tree || tree.semesters.length === 0 ? (
              <div className="sidebar-empty">Aucune ECUE configurée.</div>
            ) : (
              tree.semesters.map((sem) => (
                <div key={sem.id} className="semester-group">
                  <div className="sem-header">Semestre {sem.number}</div>

                  {sem.ues.map((ue) => {
                    const isExpanded = expandedUeIds[ue.id] ?? false;
                    const matchingEcues = ue.ecues.filter((ecue) =>
                      !searchQuery.trim() ||
                      ecue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (ecue.code && ecue.code.toLowerCase().includes(searchQuery.toLowerCase()))
                    );

                    if (searchQuery.trim() && matchingEcues.length === 0) return null;

                    return (
                      <div key={ue.id} className="ue-group">
                        <div className="ue-header" onClick={() => toggleUe(ue.id)}>
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span className="ue-code-badge">{ue.code || 'UE'}</span>
                          <span className="ue-title">{ue.title}</span>
                        </div>

                        {isExpanded && (
                          <div className="ecue-list">
                            {matchingEcues.map((ecue) => {
                              const isSelected = selectedEcue?.ecue.id === ecue.id;
                              return (
                                <div
                                  key={ecue.id}
                                  className={`ecue-item ${isSelected ? 'selected' : ''}`}
                                  onClick={() =>
                                    setSelectedEcue({
                                      ecue,
                                      ueCode: ue.code,
                                      ueTitle: ue.title,
                                      semNumber: sem.number,
                                    })
                                  }
                                >
                                  <Folder size={15} className="ecue-folder-icon" />
                                  <div className="ecue-info">
                                    <span className="ecue-name">
                                      {ecue.code ? `[${ecue.code}] ` : ''}{ecue.title}
                                    </span>
                                    {ecue.ects && Number(ecue.ects) > 0 && (
                                      <span className="ecue-ects">{ecue.ects} ECTS</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Main Zone: Compartments Cards */}
        <div className="library-main-zone">
          {!selectedEcue ? (
            <div className="empty-selection glass-card">
              <Library size={36} className="text-muted" />
              <h3>Sélectionnez une ECUE</h3>
              <p>Choisissez une ECUE dans la liste de gauche pour consulter et classer ses documents.</p>
            </div>
          ) : (
            <div className="ecue-workspace">
              {/* Selected ECUE Banner */}
              <div className="ecue-workspace-header glass-card">
                <div className="ecue-title-group">
                  <span className="sem-tag">S{selectedEcue.semNumber}</span>
                  {selectedEcue.ueCode && <span className="ue-tag">{selectedEcue.ueCode}</span>}
                  <h2>
                    {selectedEcue.ecue.code ? `[${selectedEcue.ecue.code}] ` : ''}
                    {selectedEcue.ecue.title}
                  </h2>
                </div>

                {!fileOrganizer.isTauri && (
                  <div className="web-notice-pill" title="Ajout de fichiers disponible dans l'app desktop">
                    <Info size={14} />
                    <span>Mode Web · Ajout de fichiers optimisé dans l'app desktop</span>
                  </div>
                )}
              </div>

              {loadingDocs ? (
                <div className="docs-loading glass-card">Chargement des compartiments...</div>
              ) : (
                <div className="categories-grid">
                  {/* Category Cards */}
                  {categories.map((cat) => {
                    const catDocs = ecueDocs.filter((d) => d.categoryId === cat.id);
                    const isDragOver = dragOverCatId === cat.id;

                    return (
                      <div
                        key={cat.id}
                        className={`category-card glass-card ${isDragOver ? 'drag-over' : ''}`}
                        onDragOver={(e) => handleDragOverCategory(e, cat.id, cat)}
                        onDragLeave={handleDragLeaveCategory}
                        onDrop={(e) => handleDropOnCategory(e, cat)}
                      >
                        <div className="category-card-header">
                          <div className="cat-title-row">
                            <Folder size={18} className="text-indigo" />
                            <h3>{cat.name}</h3>
                            <span className="count-badge">{catDocs.length}</span>
                          </div>

                          <div className="cat-actions">
                            <button
                              className="icon-action-btn"
                              onClick={() => handleCategoryClickImport(cat)}
                              title={`Ajouter des fichiers à ${cat.name}`}
                            >
                              <Plus size={14} />
                            </button>
                            <button
                              className="icon-action-btn"
                              onClick={() => handleOpenFolder(cat.name)}
                              title={`Ouvrir le sous-dossier ${cat.name}`}
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              className="icon-action-btn btn-delete"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              title="Supprimer ce compartiment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Documents List inside Category */}
                        <div className="category-docs-list" onClick={() => handleCategoryClickImport(cat)}>
                          {catDocs.length === 0 ? (
                            <div className="drop-hint">
                              <UploadCloud size={20} />
                              <span>Glissez-déposez ou cliquez pour ajouter des fichiers</span>
                            </div>
                          ) : (
                            catDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="doc-item-row"
                                draggable
                                onDragStart={(e) => handleDocDragStart(e, doc)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDocForPreview(doc);
                                }}
                                title="Cliquer pour lire sans télécharger · Glisser pour déplacer"
                              >
                                {getDocIcon(doc.mimeType, doc.originalName)}
                                <div className="doc-item-name">{doc.originalName}</div>
                                <span className="doc-item-size">{formatSize(doc.fileSize)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Unclassified Category Card (Non Classés) */}
                  {(() => {
                    const unclassifiedDocs = ecueDocs.filter((d) => !d.categoryId);
                    const isDragOver = dragOverCatId === 'unclassified';

                    return (
                      <div
                        className={`category-card glass-card unclassified-card ${isDragOver ? 'drag-over' : ''}`}
                        onDragOver={(e) => handleDragOverCategory(e, 'unclassified', null)}
                        onDragLeave={handleDragLeaveCategory}
                        onDrop={(e) => handleDropOnCategory(e, null)}
                      >
                        <div className="category-card-header">
                          <div className="cat-title-row">
                            <Folder size={18} className="text-amber" />
                            <h3>Non classé</h3>
                            <span className="count-badge">{unclassifiedDocs.length}</span>
                          </div>

                          <button
                            className="icon-action-btn"
                            onClick={() => handleCategoryClickImport(null)}
                            title="Ajouter des fichiers non classés"
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="category-docs-list" onClick={() => handleCategoryClickImport(null)}>
                          {unclassifiedDocs.length === 0 ? (
                            <div className="drop-hint text-muted">
                              <UploadCloud size={18} />
                              <span>Glissez-déposez ou cliquez pour ajouter des fichiers</span>
                            </div>
                          ) : (
                            unclassifiedDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="doc-item-row"
                                draggable
                                onDragStart={(e) => handleDocDragStart(e, doc)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDocForPreview(doc);
                                }}
                                title="Cliquer pour lire sans télécharger · Glisser pour déplacer"
                              >
                                {getDocIcon(doc.mimeType, doc.originalName)}
                                <div className="doc-item-name">{doc.originalName}</div>
                                <span className="doc-item-size">{formatSize(doc.fileSize)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      {showAddCatModal && (
        <div className="modal-backdrop" onClick={() => setShowAddCatModal(false)}>
          <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <h3>+ Nouveau compartiment</h3>
            <p className="subtitle">Exemples: Cours, TD, TP, Examens, Fiches de révision...</p>
            <form onSubmit={handleCreateCategory}>
              <input
                type="text"
                placeholder="Nom du compartiment (ex : Fiches de révision)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                autoFocus
                required
              />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddCatModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Créer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Integrated Fullscreen Document Viewer Modal */}
      <FilePreviewModal
        isOpen={!!selectedDocForPreview}
        onClose={() => setSelectedDocForPreview(null)}
        document={selectedDocForPreview}
      />

      <style>{`
        .toast-notification-banner {
          position: fixed;
          top: 1.25rem;
          right: 1.5rem;
          z-index: 1000;
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          background: #0f172a;
          border: 1px solid #10b981;
          color: #ffffff;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
          font-weight: 600;
          font-size: 0.875rem;
        }

        .category-card.drag-over {
          border-color: #10b981 !important;
          background: rgba(16, 185, 129, 0.15) !important;
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.35) !important;
          transform: scale(1.01);
        }

        .text-emerald { color: #10b981; }

        .library-page {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .header-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .library-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 1.25rem;
          align-items: flex-start;
        }

        .library-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          max-height: 78vh;
        }

        .sidebar-search {
          position: relative;
          display: flex;
          align-items: center;
        }

        .sidebar-search input {
          width: 100%;
          padding: 0.5rem 0.75rem 0.5rem 2.25rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-primary);
          font-size: 0.85rem;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          color: var(--text-muted);
        }

        .tree-scroll {
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-right: 0.25rem;
        }

        .sem-header {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.35rem;
        }

        .ue-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.3rem 0.4rem;
          border-radius: 6px;
        }
        .ue-header:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .ue-code-badge {
          font-size: 0.68rem;
          font-weight: 700;
          color: #818cf8;
          background: rgba(99, 102, 241, 0.15);
          padding: 0.05rem 0.35rem;
          border-radius: 4px;
        }

        .ecue-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding-left: 1rem;
          margin-top: 0.25rem;
        }

        .ecue-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .ecue-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .ecue-item.selected {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
          color: #ffffff;
        }

        .ecue-folder-icon {
          color: var(--primary);
          flex-shrink: 0;
        }

        .ecue-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .ecue-name {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ecue-ects {
          font-size: 0.68rem;
          color: var(--text-muted);
        }

        .library-main-zone {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .empty-selection {
          padding: 4rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          border-radius: 12px;
        }

        .ecue-workspace {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ecue-workspace-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-radius: 12px;
        }

        .ecue-title-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .sem-tag, .ue-tag {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
        }

        .web-notice-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.05);
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
        }

        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .category-card {
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-height: 180px;
          transition: all 0.2s ease;
          position: relative;
        }

        .category-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .cat-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .cat-title-row h3 {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .count-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.05rem 0.4rem;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
        }

        .cat-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .icon-action-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          padding: 0.25rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .icon-action-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }
        .icon-action-btn.btn-delete:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.15);
        }

        .category-docs-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex: 1;
          min-height: 100px;
          cursor: pointer;
        }

        .drop-hint {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          border: 1.5px dashed rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          padding: 1.25rem;
          color: var(--text-muted);
          font-size: 0.78rem;
          text-align: center;
          transition: border-color 0.15s ease;
        }
        .drop-hint:hover {
          border-color: var(--primary);
          color: var(--text-primary);
        }

        .doc-item-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .doc-item-row:hover {
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
        }

        .doc-item-name {
          flex: 1;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .doc-item-size {
          font-size: 0.68rem;
          color: var(--text-muted);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .modal-card {
          width: 400px;
          padding: 1.5rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .modal-card input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.3);
          color: #ffffff;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .text-muted { color: var(--text-muted); }
        .text-indigo { color: var(--primary); }
        .text-amber { color: #f59e0b; }
      `}</style>
    </div>
  );
};
