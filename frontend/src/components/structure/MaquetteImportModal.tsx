import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { processMultiOrientationOCR } from '../../utils/ocrImage';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { StructureImportItem, StructureImportSummary } from '../../types/structure';
import { importStructureBatch } from '../../services/academicStructureService';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Layers,
  BookOpen,
  UserCheck,
  FileText,
  Image as ImageIcon
} from 'lucide-react';



interface MaquetteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type FieldKey =
  | 'ue_title'
  | 'ue_code'
  | 'ects'
  | 'semester'
  | 'ecue_title'
  | 'ecue_code'
  | 'subject_name'
  | 'instructor';

interface FieldConfig {
  key: FieldKey;
  label: string;
  required?: boolean;
  matchers: RegExp[];
}

const FIELD_CONFIGS: FieldConfig[] = [
  {
    key: 'ue_title',
    label: "Intitulé UE",
    required: true,
    matchers: [/intitul.*ue/i, /titre.*ue/i, /unite.*enseignement/i, /ue/i],
  },
  {
    key: 'ue_code',
    label: "Code UE",
    matchers: [/code.*ue/i, /code_ue/i],
  },
  {
    key: 'ects',
    label: "ECTS UE",
    matchers: [/ects/i, /credit/i, /crédit/i],
  },
  {
    key: 'semester',
    label: "Semestre (ex: 1, 2)",
    matchers: [/semestre/i, /sem/i],
  },
  {
    key: 'ecue_title',
    label: "Intitulé ECUE",
    matchers: [/intitul.*ecue/i, /titre.*ecue/i, /element.*constitutif/i, /ecue/i],
  },
  {
    key: 'ecue_code',
    label: "Code ECUE",
    matchers: [/code.*ecue/i, /code_ecue/i],
  },
  {
    key: 'subject_name',
    label: "Nom de la Matière / Cours",
    matchers: [/matiere/i, /matière/i, /cours/i, /enseignement/i, /discipline/i],
  },
  {
    key: 'instructor',
    label: "Enseignant / Intervenant",
    matchers: [/enseignant/i, /prof/i, /responsable/i, /intervenant/i, /formateur/i],
  },
];

export const MaquetteImportModal: React.FC<MaquetteImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[][]>([]);

  // Étape 2 : Ligne d'en-tête et mapping
  const [headerIndex, setHeaderIndex] = useState<number>(0);
  const [columnMapping, setColumnMapping] = useState<Record<FieldKey, number>>({
    ue_title: -1,
    ue_code: -1,
    ects: -1,
    semester: -1,
    ecue_title: -1,
    ecue_code: -1,
    subject_name: -1,
    instructor: -1,
  });

  // Étape 3 : Aperçu & Validation
  const [excludedUEKeys, setExcludedUEKeys] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [importSummary, setImportSummary] = useState<StructureImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [isImageFormat, setIsImageFormat] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFile(null);
      setWorkbook(null);
      setSelectedSheet('');
      setRawRows([]);
      setHeaderIndex(0);
      setColumnMapping({
        ue_title: -1,
        ue_code: -1,
        ects: -1,
        semester: -1,
        ecue_title: -1,
        ecue_code: -1,
        subject_name: -1,
        instructor: -1,
      });
      setExcludedUEKeys(new Set());
      setSubmitting(false);
      setImportSummary(null);
      setError(null);
      setOcrLoading(false);
      setOcrProgress(0);
      setIsImageFormat(false);
    }
  }, [isOpen]);

  // Ligne d'en-tête actuelle
  const headers = useMemo(() => {
    if (rawRows.length === 0 || headerIndex >= rawRows.length) return [];
    return rawRows[headerIndex].map((cell, idx) => String(cell || '').trim() || `Colonne ${idx + 1}`);
  }, [rawRows, headerIndex]);

  // Détecter auto la ligne d'en-tête et les colonnes
  const autoDetect = (rows: any[][]) => {
    if (rows.length === 0) return;

    let bestHeaderRowIdx = 0;
    let maxScore = -1;

    const maxCheckRows = Math.min(10, rows.length);
    for (let r = 0; r < maxCheckRows; r++) {
      const row = rows[r] || [];
      let score = 0;
      row.forEach((cell) => {
        const val = String(cell || '').trim();
        if (!val) return;
        FIELD_CONFIGS.forEach((cfg) => {
          if (cfg.matchers.some((m) => m.test(val))) {
            score += 2;
          }
        });
      });
      if (score > maxScore) {
        maxScore = score;
        bestHeaderRowIdx = r;
      }
    }

    setHeaderIndex(bestHeaderRowIdx);
    autoMapColumns(rows[bestHeaderRowIdx] || []);
  };

  const autoMapColumns = (headerCells: any[]) => {
    const newMapping: Record<FieldKey, number> = {
      ue_title: -1,
      ue_code: -1,
      ects: -1,
      semester: -1,
      ecue_title: -1,
      ecue_code: -1,
      subject_name: -1,
      instructor: -1,
    };

    headerCells.forEach((cell, colIdx) => {
      const val = String(cell || '').trim();
      if (!val) return;

      FIELD_CONFIGS.forEach((cfg) => {
        if (newMapping[cfg.key] === -1) {
          if (cfg.matchers.some((m) => m.test(val))) {
            newMapping[cfg.key] = colIdx;
          }
        }
      });
    });

    setColumnMapping(newMapping);
  };

  // Helper pour convertir un tableau de lignes textuelles en tableau 2D rawRows
  const parseTextLinesToRows = (extractedLines: string[]): any[][] => {
    const rows: any[][] = [];

    // Ligne d'en-tête générée pour l'étape 2 (Mapping)
    rows.push([
      'Semestre',
      'Code UE',
      'Intitulé UE',
      'ECTS',
      'Code ECUE',
      'Intitulé ECUE',
      'Nom de la Matière',
      'Enseignant'
    ]);

    let currentSemester = '1';
    let currentUeCode = '';
    let currentUeTitle = '';
    let currentEcts = '';
    let currentEcueCode = '';
    let currentEcueTitle = '';

    for (const line of extractedLines) {
      const semMatch = line.match(/(?:Semestre|Sem|S)\s*(\d+)/i);
      if (semMatch) {
        currentSemester = semMatch[1];
      }

      const ectsMatch = line.match(/(\d+(?:[\.,]\d+)?)\s*(?:ECTS|crédits?)/i);
      const lineEcts = ectsMatch ? ectsMatch[1] : '';

      const isUeLine = /(?:UE\s*\d+|Unité\s+d['’]Enseignement)/i.test(line);
      const isEcueLine = /(?:ECUE|Élément\s+Constitutif)/i.test(line);

      if (isUeLine) {
        const match = line.match(/(?:UE\s*\d*|Unité\s+d['’]Enseignement)\s*[:\-–]?\s*(.*)/i);
        const codeMatch = line.match(/(?:UE\s*\d+)/i);
        currentUeCode = codeMatch ? codeMatch[0] : '';
        currentUeTitle = match && match[1] ? match[1].trim() : line;
        if (lineEcts) currentEcts = lineEcts;
        currentEcueCode = '';
        currentEcueTitle = '';

        rows.push([
          `Semestre ${currentSemester}`,
          currentUeCode,
          currentUeTitle || line,
          currentEcts,
          '',
          '',
          '',
          ''
        ]);
      } else if (isEcueLine) {
        const match = line.match(/(?:ECUE\s*\d*|Élément\s+Constitutif)\s*[:\-–]?\s*(.*)/i);
        const codeMatch = line.match(/(?:ECUE\s*\d+[A-Z]?)/i);
        currentEcueCode = codeMatch ? codeMatch[0] : '';
        currentEcueTitle = match && match[1] ? match[1].trim() : line;

        rows.push([
          `Semestre ${currentSemester}`,
          currentUeCode,
          currentUeTitle,
          currentEcts,
          currentEcueCode,
          currentEcueTitle || line,
          '',
          ''
        ]);
      } else {
        if (currentUeTitle) {
          const profMatch = line.match(/(?:Prof|Dr|Mme|M\.)\s+[A-Za-z\-]+/i);
          const instructor = profMatch ? profMatch[0] : '';
          const subjectName = profMatch ? line.replace(profMatch[0], '').trim() : line;

          rows.push([
            `Semestre ${currentSemester}`,
            currentUeCode,
            currentUeTitle,
            lineEcts || currentEcts,
            currentEcueCode,
            currentEcueTitle,
            subjectName,
            instructor
          ]);
        } else {
          rows.push([line]);
        }
      }
    }

    return rows;
  };

  // Extraction du texte d'un fichier PDF
  const parsePdfFile = async (arrayBuffer: ArrayBuffer): Promise<any[][]> => {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const extractedLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const lineMap = new Map<number, { x: number; text: string }[]>();

      textContent.items.forEach((item: any) => {
        if (!('str' in item) || !item.str.trim()) return;
        const transform = item.transform;
        const x = transform[4];
        const y = Math.round(transform[5] / 5) * 5;

        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push({ x, text: item.str.trim() });
      });

      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);

      sortedY.forEach((y) => {
        const itemsInLine = lineMap.get(y)!;
        itemsInLine.sort((a, b) => a.x - b.x);
        const lineStr = itemsInLine.map((i) => i.text).join(' ');
        if (lineStr.trim()) {
          extractedLines.push(lineStr.trim());
        }
      });
    }

    return parseTextLinesToRows(extractedLines);
  };

  // Extraction du texte via OCR multi-orientations pour les images (JPG / PNG)
  const parseImageFile = async (imageFile: File): Promise<any[][]> => {
    setOcrLoading(true);
    setOcrProgress(0);
    try {
      const rawText = await processMultiOrientationOCR(imageFile, (_msg, progressPct) => {
        setOcrProgress(progressPct);
      });
      const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      return parseTextLinesToRows(lines);
    } catch (_err) {
      throw new Error("Échec de la reconnaissance OCR sur l'image.");
    } finally {
      setOcrLoading(false);
    }
  };

  // Traitement du fichier
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);

    const fileName = selected.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf') || selected.type === 'application/pdf';
    const isImg = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.png') || selected.type.startsWith('image/');

    setIsImageFormat(isImg);

    if (isImg) {
      setWorkbook(null);
      setSelectedSheet('');
      try {
        const imgRows = await parseImageFile(selected);
        setRawRows(imgRows);
        autoDetect(imgRows);
      } catch (err) {
        setError("Erreur lors de l'analyse OCR de l'image. Assurez-vous que l'image est lisible.");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        if (isPdf) {
          setWorkbook(null);
          setSelectedSheet('');
          const pdfRows = await parsePdfFile(buffer);
          setRawRows(pdfRows);
          autoDetect(pdfRows);
        } else {
          const wb = XLSX.read(buffer, { type: 'array' });
          setWorkbook(wb);

          const firstSheetName = wb.SheetNames[0];
          setSelectedSheet(firstSheetName);
          loadSheetData(wb, firstSheetName);
        }
      } catch (err) {
        setError(isPdf ? "Erreur lors de la lecture du fichier PDF texte." : "Erreur lors de la lecture du fichier Excel/CSV.");
      }
    };
    reader.readAsArrayBuffer(selected);
  };



  const loadSheetData = (wb: XLSX.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
    setRawRows(rows);
    autoDetect(rows);
  };

  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (workbook) {
      loadSheetData(workbook, sheetName);
    }
  };

  const handleHeaderRowSelect = (newIdx: number) => {
    setHeaderIndex(newIdx);
    if (rawRows[newIdx]) {
      autoMapColumns(rawRows[newIdx]);
    }
  };

  // Traitement des données pour l'Étape 3 (Aperçu + Héritage)
  const parsedItemsData = useMemo(() => {
    if (step < 2 || columnMapping.ue_title === -1 || rawRows.length === 0) {
      return { items: [], warningsCount: 0 };
    }

    const items: StructureImportItem[] = [];
    let warningsCount = 0;

    let prevSemester = 1;
    let prevUeTitle = '';
    let prevUeCode = '';
    let prevEcts: number | null = null;
    let prevEcueTitle = '';
    let prevEcueCode = '';

    for (let r = headerIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r] || [];

      const getVal = (key: FieldKey): string => {
        const cIdx = columnMapping[key];
        if (cIdx === -1 || cIdx >= row.length) return '';
        return String(row[cIdx] || '').trim();
      };

      let rawUeTitle = getVal('ue_title');
      let rawUeCode = getVal('ue_code');
      let rawEctsStr = getVal('ects');
      let rawSemesterStr = getVal('semester');
      let rawEcueTitle = getVal('ecue_title');
      let rawEcueCode = getVal('ecue_code');
      let rawSubjectName = getVal('subject_name');
      let rawInstructor = getVal('instructor');

      const isEmptyRow = !rawUeTitle && !rawUeCode && !rawEcueTitle && !rawSubjectName;
      if (isEmptyRow) continue;

      // Héritage UE
      if (!rawUeTitle) {
        if (prevUeTitle) {
          rawUeTitle = prevUeTitle;
          rawUeCode = prevUeCode;
          rawEctsStr = prevEcts !== null ? String(prevEcts) : '';
        } else {
          warningsCount++;
          continue;
        }
      } else {
        if (rawUeTitle !== prevUeTitle) {
          prevEcueTitle = '';
          prevEcueCode = '';
        }
        prevUeTitle = rawUeTitle;
        prevUeCode = rawUeCode;
        const parsedEcts = parseFloat(rawEctsStr.replace(',', '.'));
        prevEcts = !isNaN(parsedEcts) && parsedEcts > 0 ? parsedEcts : null;
      }

      // Héritage Semestre
      let semNum = prevSemester;
      if (rawSemesterStr) {
        const parsedSem = parseInt(rawSemesterStr.replace(/\D/g, ''), 10);
        if (!isNaN(parsedSem) && parsedSem >= 1 && parsedSem <= 12) {
          semNum = parsedSem;
          prevSemester = semNum;
        }
      }

      const parsedEcts = parseFloat(rawEctsStr.replace(',', '.'));
      const ectsVal = !isNaN(parsedEcts) && parsedEcts > 0 ? parsedEcts : prevEcts;

      // Héritage ECUE
      if (!rawEcueTitle && prevEcueTitle) {
        rawEcueTitle = prevEcueTitle;
        rawEcueCode = prevEcueCode;
      } else if (rawEcueTitle) {
        prevEcueTitle = rawEcueTitle;
        prevEcueCode = rawEcueCode;
      }


      items.push({
        semesterNumber: semNum,
        ueTitle: rawUeTitle,
        ueCode: rawUeCode || undefined,
        ects: ectsVal,
        ecueTitle: rawEcueTitle || undefined,
        ecueCode: rawEcueCode || undefined,
        subjectName: rawSubjectName || undefined,
        instructor: rawInstructor || undefined,
      });
    }

    return { items, warningsCount };
  }, [rawRows, headerIndex, columnMapping, step]);

  // Arbre hiérarchique pour l'aperçu
  const previewTree = useMemo(() => {
    const map = new Map<number, Map<string, { title: string; code?: string; ects?: number | null; ecues: Map<string, { title: string; code?: string; subjects: { name: string; instructor?: string }[] }>; directSubjects: { name: string; instructor?: string }[] }>>();

    parsedItemsData.items.forEach((it) => {
      const semNum = it.semesterNumber;
      if (!map.has(semNum)) map.set(semNum, new Map());
      const semMap = map.get(semNum)!;

      const ueKey = `${it.ueCode || ''}___${it.ueTitle}`;
      if (!semMap.has(ueKey)) {
        semMap.set(ueKey, {
          title: it.ueTitle,
          code: it.ueCode,
          ects: it.ects,
          ecues: new Map(),
          directSubjects: [],
        });
      }
      const ueNode = semMap.get(ueKey)!;

      if (it.ecueTitle) {
        const ecueKey = `${it.ecueCode || ''}___${it.ecueTitle}`;
        if (!ueNode.ecues.has(ecueKey)) {
          ueNode.ecues.set(ecueKey, {
            title: it.ecueTitle,
            code: it.ecueCode,
            subjects: [],
          });
        }
        const ecueNode = ueNode.ecues.get(ecueKey)!;
        if (it.subjectName) {
          ecueNode.subjects.push({ name: it.subjectName, instructor: it.instructor });
        }
      } else if (it.subjectName) {
        ueNode.directSubjects.push({ name: it.subjectName, instructor: it.instructor });
      }
    });

    return map;
  }, [parsedItemsData.items]);

  const toggleUEExclusion = (ueKey: string) => {
    setExcludedUEKeys((prev) => {
      const next = new Set(prev);
      if (next.has(ueKey)) {
        next.delete(ueKey);
      } else {
        next.add(ueKey);
      }
      return next;
    });
  };

  const handleFinalSubmit = async () => {
    const finalItems = parsedItemsData.items.filter((it) => {
      const ueKey = `${it.semesterNumber}:${it.ueCode || ''}___${it.ueTitle}`;
      return !excludedUEKeys.has(ueKey);
    });

    if (finalItems.length === 0) {
      setError("Aucun élément à importer.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await importStructureBatch({ items: finalItems });
      if (res.success && res.data) {
        setImportSummary(res.data);
      } else {
        setError(res.error?.message || "Erreur lors de l'importation de la maquette.");
      }
    } catch (_err) {
      setError("Erreur de connexion avec le serveur.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card maquette-import-modal">
        <div className="modal-header">
          <div className="modal-title-box">
            <FileSpreadsheet className="modal-icon text-indigo" size={22} />
            <div>
              <h3>Importation de Maquette Pédagogique</h3>
              <p className="subtitle">Convertissez votre fichier Excel ou CSV en arborescence de cours</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={submitting}>
            <X size={18} />
          </button>
        </div>

        <div className="stepper-header">
          <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="step-num">1</span>
            <span className="step-label">1. Fichier</span>
          </div>
          <div className="step-line" />
          <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">2. Colonnes</span>
          </div>
          <div className="step-line" />
          <div className={`step-item ${step === 3 ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-label">3. Aperçu & Validation</span>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {step === 1 && (
          <div className="step-content">
            <div className="file-dropzone">
              <Upload size={36} className="text-indigo" />
              <h4>Sélectionnez votre maquette académique</h4>
              <p>Format accepté : Excel (.xlsx, .xls), CSV, PDF (.pdf) ou Image (.jpg, .jpeg, .png)</p>
              <label className="btn-browse">
                {ocrLoading ? 'Analyse OCR en cours...' : 'Parcourir les fichiers'}
                <input
                  type="file"
                  accept=".csv, .xls, .xlsx, .pdf, .jpg, .jpeg, .png"
                  onChange={handleFileChange}
                  disabled={ocrLoading}
                  style={{ display: 'none' }}
                />
              </label>
              {ocrLoading && (
                <div className="ocr-progress-box">
                  <RefreshCw size={16} className="spinning text-indigo" />
                  <span>Reconnaissance du texte en cours... {ocrProgress}%</span>
                </div>
              )}
              {file && !ocrLoading && (
                <div className="file-selected-badge">
                  {isImageFormat ? (
                    <ImageIcon size={16} />
                  ) : file.name.toLowerCase().endsWith('.pdf') ? (
                    <FileText size={16} />
                  ) : (
                    <FileSpreadsheet size={16} />
                  )}
                  <span>{file.name}</span>
                </div>
              )}
            </div>

            {isImageFormat && (
              <div className="alert alert-warning">
                <AlertTriangle size={16} />
                <span>La qualité de l'extraction dépend de la netteté de l'image. Vérifiez attentivement le résultat.</span>
              </div>
            )}


            {workbook && workbook.SheetNames.length > 1 && (
              <div className="form-group sheet-selector">
                <label>Feuille de calcul :</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetSelect(e.target.value)}
                >
                  {workbook.SheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {rawRows.length > 0 && (
              <div className="preview-raw-box">
                <div className="preview-raw-header">
                  <span>Aperçu des 8 premières lignes :</span>
                  <span className="rows-count">{rawRows.length} lignes trouvées</span>
                </div>
                <div className="table-scroll">
                  <table className="raw-table">
                    <tbody>
                      {rawRows.slice(0, 8).map((r, rIdx) => (
                        <tr key={rIdx}>
                          <td className="row-num">{rIdx + 1}</td>
                          {(r || []).map((c: any, cIdx: number) => (
                            <td key={cIdx}>{String(c || '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="step-content">
            <div className="config-header-row">
              <div className="form-group">
                <label>Ligne d'en-tête (titres des colonnes) :</label>
                <select
                  value={headerIndex}
                  onChange={(e) => handleHeaderRowSelect(Number(e.target.value))}
                >
                  {rawRows.slice(0, Math.min(10, rawRows.length)).map((_, idx) => (
                    <option key={idx} value={idx}>
                      Ligne {idx + 1} : {(rawRows[idx] || []).filter(Boolean).slice(0, 4).join(' | ')}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {columnMapping.ue_title === -1 && (
              <div className="alert alert-warning">
                <AlertTriangle size={16} />
                <span>La colonne <strong>Intitulé UE</strong> est obligatoire pour continuer.</span>
              </div>
            )}

            <div className="mapping-grid">
              {FIELD_CONFIGS.map((cfg) => (
                <div key={cfg.key} className="form-group mapping-card">
                  <label>
                    {cfg.label} {cfg.required && <span className="text-red">*</span>}
                  </label>
                  <select
                    value={columnMapping[cfg.key]}
                    onChange={(e) =>
                      setColumnMapping({
                        ...columnMapping,
                        [cfg.key]: Number(e.target.value),
                      })
                    }
                  >
                    <option value={-1}>-- Ignorer cette donnée --</option>
                    {headers.map((h, hIdx) => (
                      <option key={hIdx} value={hIdx}>
                        Colonne {hIdx + 1} : {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="info-box-heritage">
              <Layers size={16} />
              <p>
                <strong>Gestion des cellules fusionnées :</strong> Si l'intitulé d'une UE ou d'une ECUE est vide sur une ligne, le système l'associera automatiquement à l'UE/ECUE de la ligne précédente.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-content">
            {importSummary ? (
              <div className="summary-success-box">
                <CheckCircle2 size={48} className="text-emerald" />
                <h3>Importation Réussie !</h3>
                <p>Votre arborescence de cours a été mise à jour avec succès.</p>
                <div className="summary-metrics">
                  <div className="metric-card">
                    <span className="metric-val">{importSummary.created.ues}</span>
                    <span className="metric-label">UEs créées</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-val">{importSummary.created.ecues}</span>
                    <span className="metric-label">ECUEs créés</span>
                  </div>
                  <div className="metric-card">
                    <span className="metric-val">{importSummary.created.subjects}</span>
                    <span className="metric-label">Matières créées</span>
                  </div>
                  <div className="metric-card muted">
                    <span className="metric-val">{importSummary.skipped.ues + importSummary.skipped.ecues + importSummary.skipped.subjects}</span>
                    <span className="metric-label">Éléments déjà existants</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="preview-meta-bar">
                  <div>
                    <h4>Structure à importer ({parsedItemsData.items.length} éléments identifiés)</h4>
                    <p className="text-muted">Décocher une UE pour l'exclure de l'importation.</p>
                  </div>
                  {parsedItemsData.warningsCount > 0 && (
                    <div className="badge-warning">
                      <AlertTriangle size={14} />
                      <span>{parsedItemsData.warningsCount} lignes ignorées (sans UE)</span>
                    </div>
                  )}
                </div>

                <div className="tree-preview-container">
                  {Array.from(previewTree.entries()).map(([semNum, uesMap]) => (
                    <div key={semNum} className="preview-semester-group">
                      <div className="sem-header">Semestre {semNum}</div>
                      <div className="sem-ues-list">
                        {Array.from(uesMap.entries()).map(([ueKey, ueNode]) => {
                          const fullKey = `${semNum}:${ueKey}`;
                          const isExcluded = excludedUEKeys.has(fullKey);

                          return (
                            <div key={ueKey} className={`preview-ue-card ${isExcluded ? 'excluded' : ''}`}>
                              <div className="ue-header">
                                <label className="checkbox-label">
                                  <input
                                    type="checkbox"
                                    checked={!isExcluded}
                                    onChange={() => toggleUEExclusion(fullKey)}
                                  />
                                  <span className="ue-title">
                                    {ueNode.code ? `[${ueNode.code}] ` : ''}{ueNode.title}
                                  </span>
                                </label>
                                {ueNode.ects && <span className="ects-badge">{ueNode.ects} ECTS</span>}
                              </div>

                              {!isExcluded && (
                                <div className="ue-body">
                                  {ueNode.directSubjects.length > 0 && (
                                    <div className="direct-subjects-list">
                                      {ueNode.directSubjects.map((sub, sIdx) => (
                                        <div key={sIdx} className="preview-subject-item">
                                          <BookOpen size={13} className="text-indigo" />
                                          <span>{sub.name}</span>
                                          {sub.instructor && (
                                            <span className="instructor-tag">
                                              <UserCheck size={12} /> {sub.instructor}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {Array.from(ueNode.ecues.entries()).map(([ecueKey, ecueNode]) => (
                                    <div key={ecueKey} className="preview-ecue-box">
                                      <div className="ecue-title">
                                        ECUE : {ecueNode.code ? `[${ecueNode.code}] ` : ''}{ecueNode.title}
                                      </div>
                                      <div className="ecue-subjects">
                                        {ecueNode.subjects.map((sub, sIdx) => (
                                          <div key={sIdx} className="preview-subject-item">
                                            <BookOpen size={13} className="text-indigo" />
                                            <span>{sub.name}</span>
                                            {sub.instructor && (
                                              <span className="instructor-tag">
                                                <UserCheck size={12} /> {sub.instructor}
                                              </span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="modal-footer">
          {importSummary ? (
            <button className="btn-submit" onClick={onSuccess}>
              Terminer & Rafraîchir l'arborescence
            </button>
          ) : (
            <>
              {step > 1 && (
                <button
                  className="btn-cancel"
                  onClick={() => setStep((s) => (s - 1) as any)}
                  disabled={submitting}
                >
                  <ArrowLeft size={16} /> Précédent
                </button>
              )}
              {step === 1 && (
                <button
                  className="btn-submit"
                  disabled={!rawRows.length}
                  onClick={() => setStep(2)}
                >
                  Suivant : Configurer le Mapping <ArrowRight size={16} />
                </button>
              )}
              {step === 2 && (
                <button
                  className="btn-submit"
                  disabled={columnMapping.ue_title === -1}
                  onClick={() => setStep(3)}
                >
                  Suivant : Prévisualiser <ArrowRight size={16} />
                </button>
              )}
              {step === 3 && (
                <button
                  className="btn-submit"
                  disabled={submitting || parsedItemsData.items.length === 0}
                  onClick={handleFinalSubmit}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="spinning" /> Importation en cours...
                    </>
                  ) : (
                    'Valider l\'importation'
                  )}
                </button>
              )}
            </>
          )}
        </div>

        <style>{`
          .maquette-import-modal {
            max-width: 800px;
            width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
          }

          .modal-title-box {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .modal-title-box h3 {
            font-size: 1.15rem;
            margin: 0;
          }

          .modal-title-box .subtitle {
            font-size: 0.8rem;
            color: var(--text-muted);
            margin: 0;
          }

          .close-btn {
            background: transparent;
            border: none;
            color: var(--text-muted);
            cursor: pointer;
          }

          .close-btn:hover { color: var(--text-primary); }

          .stepper-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.5rem;
            background: rgba(0, 0, 0, 0.15);
            border-bottom: 1px solid var(--border-color);
          }

          .step-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            opacity: 0.5;
          }

          .step-item.active, .step-item.completed { opacity: 1; }

          .step-num {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: var(--border-color);
            color: var(--text-secondary);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: bold;
          }

          .step-item.active .step-num {
            background: var(--primary);
            color: #fff;
          }

          .step-item.completed .step-num {
            background: var(--status-success);
            color: #fff;
          }

          .step-label { font-size: 0.85rem; font-weight: 500; }

          .step-line {
            flex: 1;
            height: 2px;
            background: var(--border-color);
            margin: 0 0.75rem;
          }

          .step-content {
            padding: 1.5rem;
            overflow-y: auto;
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .file-dropzone {
            border: 2px dashed var(--border-color);
            border-radius: var(--radius-md);
            padding: 2rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            background: rgba(255, 255, 255, 0.02);
          }

          .file-dropzone h4 { margin: 0; font-size: 1rem; }
          .file-dropzone p { margin: 0; font-size: 0.8rem; color: var(--text-muted); }

          .btn-browse {
            display: inline-block;
            padding: 0.6rem 1.2rem;
            background: var(--primary);
            color: white;
            border-radius: var(--radius-md);
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
          }

          .ocr-progress-box {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.35rem 0.75rem;
            border-radius: var(--radius-full);
            background: rgba(99, 102, 241, 0.15);
            color: var(--primary);
            font-size: 0.8rem;
            font-weight: 500;
          }

          .file-selected-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.35rem 0.75rem;
            border-radius: var(--radius-full);
            background: rgba(99, 102, 241, 0.15);
            color: var(--primary);
            font-size: 0.8rem;
            font-weight: 500;
          }


          .preview-raw-box {
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            overflow: hidden;
          }

          .preview-raw-header {
            padding: 0.5rem 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            font-weight: 600;
          }

          .table-scroll { overflow-x: auto; max-height: 200px; }

          .raw-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.75rem;
          }

          .raw-table td {
            padding: 0.4rem 0.6rem;
            border: 1px solid var(--border-color);
            white-space: nowrap;
          }

          .row-num {
            background: rgba(0, 0, 0, 0.2);
            color: var(--text-muted);
            text-align: center;
            font-weight: bold;
          }

          .mapping-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 1rem;
          }

          .mapping-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-color);
            padding: 0.75rem 1rem;
            border-radius: var(--radius-md);
          }

          .mapping-card label {
            display: block;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 0.35rem;
          }

          .mapping-card select {
            width: 100%;
            padding: 0.4rem 0.6rem;
            border-radius: var(--radius-sm);
            border: 1px solid var(--border-color);
            background: var(--bg-surface, #1e1e2d);
            color: var(--text-primary);
            font-size: 0.8rem;
          }

          .info-box-heritage {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            border-radius: var(--radius-md);
            background: rgba(99, 102, 241, 0.08);
            border: 1px solid rgba(99, 102, 241, 0.2);
            font-size: 0.8rem;
            color: var(--text-secondary);
          }

          .info-box-heritage p { margin: 0; }

          .preview-meta-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .preview-meta-bar h4 { margin: 0; font-size: 1rem; }
          .preview-meta-bar p { margin: 0; font-size: 0.8rem; }

          .badge-warning {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.3rem 0.6rem;
            border-radius: var(--radius-full);
            background: rgba(245, 158, 11, 0.15);
            color: #f59e0b;
            font-size: 0.75rem;
            font-weight: 600;
          }

          .tree-preview-container {
            max-height: 360px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding-right: 0.25rem;
          }

          .preview-semester-group {
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            overflow: hidden;
          }

          .sem-header {
            background: rgba(255, 255, 255, 0.06);
            padding: 0.5rem 0.85rem;
            font-weight: bold;
            font-size: 0.85rem;
            border-bottom: 1px solid var(--border-color);
          }

          .sem-ues-list {
            padding: 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }

          .preview-ue-card {
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            background: rgba(255, 255, 255, 0.02);
          }

          .preview-ue-card.excluded { opacity: 0.5; background: rgba(0, 0, 0, 0.2); }

          .ue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0.75rem;
            background: rgba(0, 0, 0, 0.15);
          }

          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            font-size: 0.85rem;
            font-weight: 600;
          }

          .ects-badge {
            font-size: 0.725rem;
            padding: 0.15rem 0.4rem;
            background: rgba(99, 102, 241, 0.2);
            color: var(--primary);
            border-radius: 4px;
            font-weight: bold;
          }

          .ue-body {
            padding: 0.6rem 0.75rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .preview-ecue-box {
            border-left: 2px solid var(--primary);
            padding-left: 0.6rem;
            margin-left: 0.5rem;
          }

          .ecue-title { font-size: 0.8rem; font-weight: 600; margin-bottom: 0.25rem; }

          .preview-subject-item {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            font-size: 0.8rem;
            padding: 0.15rem 0;
          }

          .instructor-tag {
            display: inline-flex;
            align-items: center;
            gap: 0.2rem;
            font-size: 0.725rem;
            color: var(--text-muted);
            margin-left: 0.5rem;
          }

          .summary-success-box {
            text-align: center;
            padding: 2rem 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
          }

          .summary-metrics {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
          }

          .metric-card {
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0.75rem 1.25rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            background: rgba(255, 255, 255, 0.03);
          }

          .metric-val { font-size: 1.5rem; font-weight: bold; color: var(--primary); }
          .metric-label { font-size: 0.75rem; color: var(--text-muted); }

          .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
          }

          .text-red { color: #ef4444; }
          .text-indigo { color: var(--primary); }
          .text-emerald { color: #10b981; }
        `}</style>
      </div>
    </div>
  );
};
