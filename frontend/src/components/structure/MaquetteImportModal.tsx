import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {
  extractTableFromMultipleImages,
  extractTableWithDetails,
  reconstructRowsFromGrid,
  DetectedGrid,
  WordItem,
} from '../../utils/ocrTable';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

import { StructureImportItem, StructureImportSummary } from '../../types/structure';
import { API_BASE_URL } from '../../services/apiClient';
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
  Image as ImageIcon,
  Sliders,
  Plus,
  Check,
  Info,
  Sparkles,
  Cpu,
} from 'lucide-react';



const ACTIONABLE_AI_ERROR = `😕 L'IA n'a pas pu lire cette photo. Solutions :
1) Utilisez le PDF ou Excel officiel (100% fiable)
2) Cliquez « Extraction locale » puis ajustez manuellement
3) Reprenez une photo plus nette, à plat et lumineuse`;

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
    label: "Intitulé de l'UE",
    required: true,
    matchers: [
      /intitule.*ue/i, /intitulé.*ue/i, /nom.*ue/i, /libelle.*ue/i, /libellé.*ue/i,
      /intitule.*unite/i, /intitulé.*unité/i, /libelle.*unite/i, /libellé.*unité/i,
      /title.*ue/i, /^ue$/i, /unite.*enseignement/i, /unité.*enseignement/i, /code.*unit/i
    ],
  },
  {
    key: 'ue_code',
    label: "Code UE",
    matchers: [/code.*ue/i, /code_ue/i, /codification/i, /code.*unité/i, /code.*unite/i],
  },
  {
    key: 'ects',
    label: "Crédits ECTS / Coefficient",
    matchers: [/ects/i, /credit/i, /crédit/i, /coef/i, /ch/i],
  },
  {
    key: 'semester',
    label: "Semestre (Numéro ou Nom)",
    matchers: [/semestre/i, /sem/i, /s[1-6]/i, /semester/i],
  },
  {
    key: 'ecue_title',
    label: "Intitulé de l'ECUE / Matière",
    matchers: [/intitule.*ecue/i, /intitulé.*ecue/i, /^ecue$/i, /element.*constitutif/i, /élément.*constitutif/i, /nom.*ecue/i],
  },
  {
    key: 'ecue_code',
    label: "Code ECUE",
    matchers: [/code.*ecue/i, /code_ecue/i, /code.*matière/i, /code.*matiere/i],
  },
  {
    key: 'subject_name',
    label: "Nom de la Matière / Cours",
    matchers: [/matiere/i, /matière/i, /cours/i, /enseignement/i, /discipline/i, /subject/i, /intitule/i, /intitulé/i],
  },
  {
    key: 'instructor',
    label: "Enseignant / Intervenant",
    matchers: [/enseignant/i, /prof/i, /responsable/i, /intervenant/i, /formateur/i, /teacher/i, /instructor/i],
  },
];

export const MaquetteImportModal: React.FC<MaquetteImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[][]>([]);

  // Étape 2 : Ligne d'en-tête, mapping & Semestre par défaut
  const [headerIndex, setHeaderIndex] = useState<number>(0);
  const [fallbackSemester, setFallbackSemester] = useState<number>(1);
  const [autoDetectBanner, setAutoDetectBanner] = useState<string | null>(null);
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
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const modalCardRef = useRef<HTMLDivElement>(null);
  const actionBlockRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const continueBtnRef = useRef<HTMLDivElement>(null);

  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [isImageFormat, setIsImageFormat] = useState<boolean>(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiStepMessage, setAiStepMessage] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFailed, setAiFailed] = useState<boolean>(false);

  const [extractedGrid, setExtractedGrid] = useState<DetectedGrid | null>(null);
  const [extractedWords, setExtractedWords] = useState<WordItem[]>([]);
  const [deskewedCanvas, setDeskewedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [showGridEditor, setShowGridEditor] = useState<boolean>(false);
  const [editableGrid, setEditableGrid] = useState<DetectedGrid | null>(null);

  useEffect(() => {
    if (rawRows.length > 0 && step === 1) {
      const timer = setTimeout(() => {
        continueBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [rawRows.length, step]);

  useEffect(() => {
    if (isImageFormat && selectedFiles.length > 0 && rawRows.length === 0) {
      const timer = setTimeout(() => {
        actionBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isImageFormat, selectedFiles.length, rawRows.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      if (modalCardRef.current) {
        modalCardRef.current.scrollTop = 0;
        modalCardRef.current.focus();
      }
      setStep(1);
      setFile(null);
      setSelectedFiles([]);
      setWorkbook(null);
      setSelectedSheet('');
      setRawRows([]);
      setExtractedGrid(null);
      setExtractedWords([]);
      setDeskewedCanvas(null);
      setShowGridEditor(false);
      setEditableGrid(null);
      setOcrLoading(false);
      setOcrProgress(0);
      setIsImageFormat(false);
      setAiLoading(false);
      setAiError(null);
      setAiFailed(false);
      setHeaderIndex(0);
      setFallbackSemester(1);
      setAutoDetectBanner(null);
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

    let recognizedCount = 0;

    headerCells.forEach((cell, colIdx) => {
      const val = String(cell || '').trim();
      if (!val) return;

      FIELD_CONFIGS.forEach((cfg) => {
        if (newMapping[cfg.key] === -1) {
          if (cfg.matchers.some((m) => m.test(val))) {
            newMapping[cfg.key] = colIdx;
            recognizedCount++;
          }
        }
      });
    });

    setColumnMapping(newMapping);

    if (recognizedCount > 0) {
      setAutoDetectBanner(
        t('maquetteImport.autoDetectedColumns', '✨ {{count}} colonne(s) reconnue(s) automatiquement', { count: recognizedCount })
      );
    } else {
      setAutoDetectBanner(null);
    }
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



  const handleApplyCustomGrid = () => {
    if (!editableGrid || extractedWords.length === 0) return;
    const newRows = reconstructRowsFromGrid(editableGrid, extractedWords);
    setRawRows(newRows);
    autoDetect(newRows);
    setShowGridEditor(false);
  };

  const handleAddHorizontalLine = () => {
    if (!editableGrid || !deskewedCanvas) return;
    const midY = Math.round((deskewedCanvas.height || 600) / 2);
    const updatedH = [...editableGrid.horizontalLines, midY].sort((a, b) => a - b);
    setEditableGrid({ ...editableGrid, horizontalLines: updatedH });
  };

  const handleAddVerticalLine = () => {
    if (!editableGrid || !deskewedCanvas) return;
    const midX = Math.round((deskewedCanvas.width || 800) / 2);
    const updatedV = [...editableGrid.verticalLines, midX].sort((a, b) => a - b);
    setEditableGrid({ ...editableGrid, verticalLines: updatedV });
  };

  const handleDeleteHorizontalLine = (index: number) => {
    if (!editableGrid) return;
    const updatedH = editableGrid.horizontalLines.filter((_, i) => i !== index);
    setEditableGrid({ ...editableGrid, horizontalLines: updatedH });
  };

  const handleDeleteVerticalLine = (index: number) => {
    if (!editableGrid) return;
    const updatedV = editableGrid.verticalLines.filter((_, i) => i !== index);
    setEditableGrid({ ...editableGrid, verticalLines: updatedV });
  };

  const handleRunLocalOcr = async () => {
    if (selectedFiles.length === 0) return;
    setWorkbook(null);
    setSelectedSheet('');
    setOcrLoading(true);
    setOcrProgress(0);
    setError(null);
    try {
      const details = await extractTableWithDetails(selectedFiles[0], (_msg, pct) => {
        setOcrProgress(pct);
      });

      let combinedRows = details.rows;
      if (selectedFiles.length > 1) {
        const restRows = await extractTableFromMultipleImages(selectedFiles.slice(1), (_msg, pct) => {
          const totalPct = Math.min(99, Math.round(50 + pct * 0.5));
          setOcrProgress(totalPct);
        });
        combinedRows = [...combinedRows, ...restRows];
      }

      setExtractedGrid(details.grid);
      setEditableGrid(details.grid);
      setExtractedWords(details.words);
      setDeskewedCanvas(details.deskewedCanvas);
      setRawRows(combinedRows);
      autoDetect(combinedRows);
    } catch (_err) {
      setError("Erreur lors de l'analyse OCR locale. Assurez-vous que les images sont lisibles.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleRunAiExtraction = async () => {
    if (selectedFiles.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    setAiFailed(false);
    setError(null);

    try {
      setAiStepMessage("1/2 Lecture OCR locale de la photo…");

      let allWordsText: string[] = [];
      for (const fileItem of selectedFiles) {
        const details = await extractTableWithDetails(fileItem);
        const imgText = (details.words || []).map((w: WordItem) => w.text).join(' ').slice(0, 6000);
        allWordsText.push(imgText);
      }
      const rawOcrText = allWordsText.join('\n').trim();

      // b) Si texte < 40 caractères -> NE PAS appeler le backend ; afficher directement le message actionnable
      if (!rawOcrText || rawOcrText.length < 40) {
        setAiFailed(true);
        setAiError(ACTIONABLE_AI_ERROR);
        return;
      }

      // c) Sinon -> POST /ai/structure { text, kind }
      setAiStepMessage("2/2 Analyse par l'IA backend…");
      const token = localStorage.getItem('studyvault_access_token') || '';
      const textResponse = await fetch(`${API_BASE_URL}/ai/structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text: rawOcrText,
          kind: 'maquette',
        }),
      });

      if (!textResponse.ok) {
        setAiFailed(true);
        setAiError(ACTIONABLE_AI_ERROR);
        return;
      }

      const data = await textResponse.json();
      let extractedRows: string[][] = Array.isArray(data.data?.rows) ? data.data.rows : [];

      if (!data.success || extractedRows.length === 0) {
        setAiFailed(true);
        setAiError(ACTIONABLE_AI_ERROR);
        return;
      }

      const defaultHeader = ["Semestre", "Code UE", "Intitulé UE", "Code ECUE", "Intitulé ECUE", "ECTS", "Enseignant"];
      const firstRowStr = (extractedRows[0] || []).join(' ').toLowerCase();
      const hasHeaderKeywords = ['code', 'intitule', 'ue', 'semestre', 'ecue'].some((kw) => firstRowStr.includes(kw));

      if (!hasHeaderKeywords) {
        extractedRows = [defaultHeader, ...extractedRows];
      }

      setRawRows(extractedRows);
      autoDetect(extractedRows);
    } catch (_err) {
      setAiFailed(true);
      setAiError(ACTIONABLE_AI_ERROR);
    } finally {
      setAiLoading(false);
      setAiStepMessage(null);
    }
  };

  // Traitement du fichier (support multi-images)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = Array.from(e.target.files || []);
    if (filesList.length === 0) return;

    setSelectedFiles(filesList);
    setFile(filesList[0]);
    setError(null);
    setAiError(null);
    setAiFailed(false);
    setRawRows([]);

    const isAllImages = filesList.every((f) => {
      const name = f.name.toLowerCase();
      return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || f.type.startsWith('image/');
    });

    setIsImageFormat(isAllImages);

    if (isAllImages) {
      setWorkbook(null);
      setSelectedSheet('');
      return;
    }

    const selected = filesList[0];
    const fileName = selected.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf') || selected.type === 'application/pdf';

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

  // Champs obligatoires non mappés
  const missingRequiredFields = useMemo(() => {
    return FIELD_CONFIGS
      .filter((cfg) => cfg.required && columnMapping[cfg.key] === -1)
      .map((cfg) => cfg.label);
  }, [columnMapping]);

  // Traitement des données pour l'Étape 3 (Aperçu + Héritage)
  const parsedItemsData = useMemo(() => {
    if (step < 2 || columnMapping.ue_title === -1 || rawRows.length === 0) {
      return { items: [], warningsCount: 0 };
    }

    const items: StructureImportItem[] = [];
    let warningsCount = 0;

    let prevSemester = fallbackSemester;
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

      // Détection & Héritage Semestre
      let semNum = prevSemester;
      if (columnMapping.semester === -1) {
        semNum = fallbackSemester;
        prevSemester = fallbackSemester;
      } else if (rawSemesterStr) {
        const normSem = rawSemesterStr.toLowerCase().trim();
        if (/s\s*1|semestre\s*1|1er\s*sem|semester\s*1|^1$/i.test(normSem)) {
          semNum = 1;
        } else if (/s\s*2|semestre\s*2|2[eè]me\s*sem|2e\s*sem|semester\s*2|^2$/i.test(normSem)) {
          semNum = 2;
        } else {
          const parsedSem = parseInt(rawSemesterStr.replace(/\D/g, ''), 10);
          if (!isNaN(parsedSem) && parsedSem >= 1 && parsedSem <= 12) {
            semNum = parsedSem;
          }
        }
        prevSemester = semNum;
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
  }, [rawRows, headerIndex, columnMapping, fallbackSemester, step]);

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
    if (parsedItemsData.items.length === 0) {
      setError("Aucun élément à importer.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessBanner(null);

    // Filtrer les items des UEs non exclues
    const itemsToImport = parsedItemsData.items.filter((item) => {
      const ueKey = `${item.ueCode || ''}___${item.ueTitle}`;
      const fullKey = `${item.semesterNumber}:${ueKey}`;
      return !excludedUEKeys.has(fullKey);
    });

    if (itemsToImport.length === 0) {
      setError("Toutes les UEs sont exclues. Sélectionnez au moins une UE.");
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('studyvault_access_token') || '';

      const response = await fetch(`${API_BASE_URL}/academic-structure/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          rows: itemsToImport,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || errJson?.message || "Erreur lors de l'importation de la maquette.");
      }

      const resData = await response.json();
      const summary = resData.data || {};

      setImportSummary({
        created: {
          ues: summary.ues || 0,
          ecues: summary.ecues || 0,
          subjects: summary.ecues || 0,
        },
        skipped: { ues: 0, ecues: 0, subjects: 0 },
        totalRows: itemsToImport.length,
      });

      const msg = `✅ Import terminé : ${summary.semestres || 0} semestre(s), ${summary.ues || 0} UE, ${summary.ecues || 0} ECUE ajoutés`;
      setSuccessBanner(msg);

      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'importation en masse de la maquette.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card maquette-import-modal" ref={modalCardRef} tabIndex={-1}>
        <div className="modal-header">
          <div className="modal-title-box">
            <FileSpreadsheet className="modal-icon text-indigo" size={22} />
            <div>
              <h3>{t('maquetteImport.title', 'Importation de Maquette Pédagogique')}</h3>
              <p className="subtitle">{t('maquetteImport.subtitle', 'Convertissez votre fichier Excel ou CSV en arborescence de cours')}</p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} disabled={submitting} aria-label="Fermer" title="Fermer" style={{ zIndex: 10 }}>
            <X size={18} />
          </button>
        </div>

        <div className="stepper-header">
          <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <span className="step-num">1</span>
            <span className="step-label">{t('maquetteImport.step1', '1. Fichier')}</span>
          </div>
          <div className="step-line" />
          <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">{t('maquetteImport.step2', '2. Colonnes')}</span>
          </div>
          <div className="step-line" />
          <div className={`step-item ${step === 3 ? 'active' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-label">{t('maquetteImport.step3', '3. Aperçu & Validation')}</span>
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
            {/* Bannière d'information recommandation Excel/PDF */}
            <div
              className="excel-recommendation-banner"
              style={{
                background: '#eff6ff',
                border: '1px solid #93c5fd',
                color: '#1e3a8a',
                padding: '12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                fontWeight: 500,
              }}
            >
              <Info size={20} style={{ flexShrink: 0, color: '#2563eb' }} />
              <span>💡 Pour de meilleurs résultats, utilisez le fichier Excel ou PDF officiel de votre maquette. Les photos peuvent nécessiter un ajustement manuel.</span>
            </div>

            <div className="file-dropzone">
              <Upload size={36} className="text-indigo" />
              <h4>Sélectionnez votre maquette académique</h4>
              <p>Format accepté : Excel (.xlsx, .xls), CSV, PDF (.pdf) ou Image (.jpg, .jpeg, .png)</p>
              <label className="btn-browse">
                {ocrLoading ? 'Analyse OCR du tableau...' : 'Parcourir les fichiers'}
                <input
                  type="file"
                  multiple
                  accept=".csv, .xls, .xlsx, .pdf, .jpg, .jpeg, .png"
                  onChange={handleFileChange}
                  disabled={ocrLoading}
                  style={{ display: 'none' }}
                />
              </label>
              {ocrLoading && (
                <div className="ocr-progress-box">
                  <RefreshCw size={16} className="spinning text-indigo" />
                  <span>Reconstruction 2D du tableau en cours... {ocrProgress}%</span>
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
                  <span>
                    {selectedFiles.length > 1
                      ? `${selectedFiles.length} photos sélectionnées (${selectedFiles.map((f) => f.name).join(', ')})`
                      : file.name}
                  </span>
                </div>
              )}
            </div>

            {isImageFormat && selectedFiles.length > 0 && rawRows.length === 0 && (
              <div
                className="extraction-mode-block"
                ref={actionBlockRef}
                style={{
                  marginTop: '1.25rem',
                  padding: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={18} className="text-indigo" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} photos sélectionnées`}
                  </span>
                </div>

                {aiError && (
                  <div className="alert alert-error" style={{ fontSize: '0.85rem', padding: '0.85rem 1rem', whiteSpace: 'pre-line', lineHeight: '1.55' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{aiError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {/* Gros bouton violet Extraction IA (recommandé) */}
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleRunAiExtraction}
                    disabled={aiLoading || ocrLoading}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      padding: '0.75rem 1.25rem',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: aiLoading || ocrLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    }}
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw size={18} className="spinning" />
                        <span>Analyse IA en cours…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>✨ Extraction IA (recommandé)</span>
                      </>
                    )}
                  </button>

                  {/* Bouton secondaire Extraction locale (sans internet) */}
                  <button
                    type="button"
                    className={`btn-secondary ${aiFailed ? 'pulse-highlight' : ''}`}
                    onClick={handleRunLocalOcr}
                    disabled={aiLoading || ocrLoading}
                    style={{
                      flex: 1,
                      minWidth: '220px',
                      padding: '0.75rem 1.25rem',
                      background: aiFailed ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      border: aiFailed ? '1px solid #818cf8' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: aiLoading || ocrLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {ocrLoading ? (
                      <>
                        <RefreshCw size={18} className="spinning text-indigo" />
                        <span>OCR local ({ocrProgress}%)…</span>
                      </>
                    ) : (
                      <>
                        <Cpu size={18} className="text-indigo" />
                        <span>Extraction locale (sans internet)</span>
                      </>
                    )}
                  </button>
                </div>
                {aiLoading && aiStepMessage && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#a5b4fc', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.25rem' }}>
                    <RefreshCw size={14} className="spinning" />
                    <span>{aiStepMessage}</span>
                  </div>
                )}
              </div>
            )}

            {isImageFormat && (
              <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                <AlertTriangle size={16} />
                <span>⚠️ L'extraction automatique peut être imparfaite. Utilisez le bouton « Ajuster la grille manuellement » pour corriger les colonnes/lignes si nécessaire.</span>
              </div>
            )}

            {isImageFormat && extractedWords.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditableGrid(extractedGrid || { horizontalLines: [100, 200, 300], verticalLines: [100, 300, 500] });
                    setShowGridEditor(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
                >
                  <Sliders size={15} className="text-indigo" />
                  <span>Ajuster la grille manuellement</span>
                </button>
              </div>
            )}

            {!ocrLoading && rawRows.length > 0 && rawRows.length < 3 && (
              <div className="alert alert-warning">
                <AlertTriangle size={16} />
                <span>Résultat insuffisant ? Utilisez de préférence le fichier Excel ou PDF officiel de votre maquette si vous l'avez.</span>
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
              <>
                <div className="preview-raw-box" ref={previewContainerRef}>
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

                <div className="continue-step1-box" ref={continueBtnRef}>
                  <button
                    type="button"
                    className="btn-continue-step1"
                    onClick={() => {
                      setStep(2);
                      if (modalCardRef.current) modalCardRef.current.scrollTop = 0;
                    }}
                  >
                    <span>Continuer &rarr; 2. Colonnes</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              </>
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

            {autoDetectBanner && (
              <div className="alert alert-success" style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} />
                <span>{autoDetectBanner}</span>
              </div>
            )}

            <div className="mapping-grid">
              {FIELD_CONFIGS.map((cfg) => {
                const isSemester = cfg.key === 'semester';

                return (
                  <div key={cfg.key} className={`form-group mapping-card ${isSemester ? 'semester-card-group' : ''}`}>
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
                      <option value={-1}>
                        {isSemester
                          ? t('maquetteImport.noSemesterCol', '-- Aucune colonne semestre --')
                          : '-- Ignorer cette donnée --'}
                      </option>
                      {headers.map((h, hIdx) => (
                        <option key={hIdx} value={hIdx}>
                          Colonne {hIdx + 1} : {h}
                        </option>
                      ))}
                    </select>

                    {isSemester && columnMapping.semester === -1 && (
                      <div className="fallback-semester-box">
                        <span className="fallback-label">
                          {t('maquetteImport.semesterBelongsTo', 'Ces cours appartiennent à :')}
                        </span>
                        <div className="semester-radio-group">
                          <button
                            type="button"
                            className={`sem-radio-btn ${fallbackSemester === 1 ? 'active' : ''}`}
                            onClick={() => setFallbackSemester(1)}
                          >
                            <span className="radio-dot" />
                            <span>{t('maquetteImport.semester1', 'Semestre 1 (S1)')}</span>
                          </button>
                          <button
                            type="button"
                            className={`sem-radio-btn ${fallbackSemester === 2 ? 'active' : ''}`}
                            onClick={() => setFallbackSemester(2)}
                          >
                            <span className="radio-dot" />
                            <span>{t('maquetteImport.semester2', 'Semestre 2 (S2)')}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
            {successBanner && (
              <div className="alert alert-success" style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={20} />
                <span>{successBanner}</span>
              </div>
            )}
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
                      <div className="sem-header">
                        <span>Semestre {semNum}</span>
                        <span className="sem-pill-badge" style={{ marginLeft: '0.5rem' }}>S{semNum}</span>
                      </div>
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
                                  <span className="sem-pill-badge">S{semNum}</span>
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
          {step === 2 && !importSummary && (
            <div className="footer-status-bar" style={{ width: '100%' }}>
              {missingRequiredFields.length > 0 ? (
                <div className="alert alert-warning" style={{ margin: 0, width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>
                    {t('maquetteImport.missingRequiredFields', '⚠️ Pour continuer, associez : {{fields}}', {
                      fields: missingRequiredFields.join(', ')
                    })}
                  </span>
                </div>
              ) : (
                <div className="alert alert-success" style={{ margin: 0, width: '100%', background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{t('maquetteImport.readyToPreview', '✅ Prêt à prévisualiser')}</span>
                </div>
              )}
            </div>
          )}

          <div className="footer-nav-row">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting} style={{ marginRight: 'auto' }}>
              ✕ Fermer
            </button>
            {importSummary ? (
              <button className="btn-submit" onClick={onSuccess}>
                {t('maquetteImport.btnFinish', 'Terminer & Rafraîchir l\'arborescence')}
              </button>
            ) : (
              <>
                {step > 1 && (
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setStep((s) => (s - 1) as any);
                      if (modalCardRef.current) modalCardRef.current.scrollTop = 0;
                    }}
                    disabled={submitting}
                  >
                    <ArrowLeft size={16} /> {t('maquetteImport.btnPrev', 'Précédent')}
                  </button>
                )}
                {step === 1 && (
                  <button
                    className="btn-submit"
                    disabled={!rawRows.length}
                    onClick={() => {
                      setStep(2);
                      if (modalCardRef.current) modalCardRef.current.scrollTop = 0;
                    }}
                  >
                    <span>{t('maquetteImport.btnNextMapping', 'Suivant : Configurer le Mapping')}</span>
                    <ArrowRight size={16} />
                  </button>
                )}
                {step === 2 && (
                  <button
                    className="btn-submit"
                    disabled={missingRequiredFields.length > 0}
                    onClick={() => {
                      setStep(3);
                      if (modalCardRef.current) modalCardRef.current.scrollTop = 0;
                    }}
                  >
                    <span>{t('maquetteImport.btnNextPreview', 'Suivant : Prévisualiser')}</span>
                    <ArrowRight size={16} />
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
                        <RefreshCw size={16} className="spinning" /> {t('maquetteImport.importing', 'Importation en cours...')}
                      </>
                    ) : (
                      <>
                        <span>{t('maquetteImport.btnFinish', 'Terminer & Rafraîchir l\'arborescence')}</span>
                        <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <style>{`
          .maquette-import-modal {
            max-width: 800px;
            width: 90vw;
            max-height: 85vh;
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
            padding: 1.5rem 1.5rem 80px 1.5rem;
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

          .continue-step1-box {
            margin-top: 1.25rem;
            width: 100%;
          }

          .btn-continue-step1 {
            width: 100%;
            padding: 0.85rem 1.5rem;
            background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            color: #ffffff;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .btn-continue-step1:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
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
          @keyframes gentlePulse {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
            50% { transform: scale(1.02); box-shadow: 0 0 0 8px rgba(99, 102, 241, 0.2); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
          }

          .pulse-highlight {
            animation: gentlePulse 2s infinite ease-in-out !important;
            border-color: #6366f1 !important;
            background: rgba(99, 102, 241, 0.25) !important;
          }

          .metric-label { font-size: 0.75rem; color: var(--text-muted); }

          .modal-footer {
            position: sticky;
            bottom: 0;
            background: #1e1e2d;
            border-top: 1px solid var(--border-color);
            padding: 1rem 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            z-index: 20;
            border-bottom-left-radius: var(--radius-lg);
            border-bottom-right-radius: var(--radius-lg);
          }

          .btn-submit, .btn-continue-step1, .btn-ai-extract {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            background: #6C63FF !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            padding: 12px 20px !important;
            border-radius: 10px !important;
            border: none !important;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-submit:hover:not(:disabled), .btn-continue-step1:hover:not(:disabled), .btn-ai-extract:hover:not(:disabled) {
            background: #5b52e0 !important;
            box-shadow: 0 4px 14px rgba(108, 99, 255, 0.4);
          }

          .btn-submit:disabled, .btn-continue-step1:disabled, .btn-ai-extract:disabled {
            opacity: 0.5 !important;
            color: #ffffff !important;
            cursor: not-allowed !important;
            background: #6C63FF !important;
          }

          .btn-cancel, .btn-local-extract {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            background: rgba(255, 255, 255, 0.08) !important;
            color: #f1f5f9 !important;
            font-weight: 600 !important;
            padding: 12px 20px !important;
            border-radius: 10px !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-cancel:hover:not(:disabled), .btn-local-extract:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.15) !important;
            color: #ffffff !important;
          }

          .btn-cancel:disabled, .btn-local-extract:disabled {
            opacity: 0.5 !important;
            color: #f1f5f9 !important;
            cursor: not-allowed !important;
          }

          .footer-nav-row {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
          }

          .fallback-semester-box {
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px dashed var(--border-color);
          }

          .fallback-label {
            font-size: 0.775rem;
            font-weight: 600;
            color: var(--text-secondary);
            display: block;
            margin-bottom: 0.4rem;
          }

          .semester-radio-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
          }

          .sem-radio-btn {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 0.65rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
            background: rgba(255, 255, 255, 0.03);
            color: var(--text-secondary);
            font-size: 0.775rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .sem-radio-btn:hover {
            background: rgba(99, 102, 241, 0.1);
            border-color: rgba(99, 102, 241, 0.4);
          }

          .sem-radio-btn.active {
            background: rgba(99, 102, 241, 0.2);
            border-color: var(--primary);
            color: #ffffff;
            box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
          }

          .radio-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            border: 2px solid var(--text-muted);
            flex-shrink: 0;
          }

          .sem-radio-btn.active .radio-dot {
            border-color: var(--primary);
            background: var(--primary);
          }

          .sem-pill-badge {
            display: inline-block;
            padding: 0.15rem 0.45rem;
            border-radius: 4px;
            background: rgba(99, 102, 241, 0.25);
            color: #818cf8;
            font-weight: 800;
            font-size: 0.725rem;
            border: 1px solid rgba(99, 102, 241, 0.4);
          }

          .text-red { color: #ef4444; }
          .text-indigo { color: var(--primary); }
          .text-emerald { color: #10b981; }

          .grid-editor-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
          }
          .grid-editor-card {
            width: 900px;
            max-width: 95vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            padding: 1.25rem;
            gap: 1rem;
            background: var(--bg-primary, #0f172a);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
          }
          .grid-editor-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
          .grid-editor-header .title-box { display: flex; align-items: center; gap: 0.5rem; font-weight: bold; }
          .grid-editor-toolbar { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; }
          .btn-small { padding: 0.35rem 0.65rem; border-radius: 6px; background: rgba(255,255,255,0.06); border: 1px solid var(--border-color); color: #fff; cursor: pointer; display: flex; align-items: center; gap: 0.3rem; }
          .btn-small:hover { background: rgba(99,102,241,0.2); }
          .toolbar-info { margin-left: auto; color: var(--text-muted); font-weight: 600; }
          .grid-editor-canvas-wrap { flex: 1; overflow: auto; text-align: center; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 1rem; }
          .grid-editor-footer { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem; }
        `}</style>

        {/* Interactive Grid Editor Overlay Modal */}
        {showGridEditor && deskewedCanvas && (
          <div className="grid-editor-backdrop">
            <div className="grid-editor-card glass-card">
              <div className="grid-editor-header">
                <div className="title-box">
                  <Sliders className="text-indigo" size={20} />
                  <h4>Correction Manuelle de la Grille (OCR)</h4>
                </div>
                <button type="button" className="close-btn" onClick={() => setShowGridEditor(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="grid-editor-toolbar">
                <button type="button" className="btn-small" onClick={handleAddHorizontalLine}>
                  <Plus size={14} /> + Ligne Horizontale (Y)
                </button>
                <button type="button" className="btn-small" onClick={handleAddVerticalLine}>
                  <Plus size={14} /> + Ligne Verticale (X)
                </button>
                <span className="toolbar-info">
                  {editableGrid?.horizontalLines.length || 0} H × {editableGrid?.verticalLines.length || 0} V
                </span>
              </div>

              <div className="grid-editor-canvas-wrap">
                <div className="grid-canvas-container" style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={deskewedCanvas.toDataURL()}
                    alt="Aperçu pour grille"
                    className="grid-canvas-img"
                    style={{ maxWidth: '100%', maxHeight: '60vh', display: 'block', borderRadius: '4px' }}
                  />
                  <svg
                    className="grid-svg-overlay"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                    viewBox={`0 0 ${deskewedCanvas.width} ${deskewedCanvas.height}`}
                  >
                    {/* Lignes Horizontales */}
                    {editableGrid?.horizontalLines.map((y, idx) => (
                      <g key={`h-${idx}`}>
                        <line x1="0" y1={y} x2={deskewedCanvas.width} y2={y} stroke="#06b6d4" strokeWidth="4" strokeDasharray="6 3" />
                        <circle cx="24" cy={y} r="10" fill="#06b6d4" cursor="pointer" onClick={() => handleDeleteHorizontalLine(idx)} />
                        <text x="40" y={y + 5} fill="#06b6d4" fontSize="14" fontWeight="bold">H{idx + 1}</text>
                      </g>
                    ))}

                    {/* Lignes Verticales */}
                    {editableGrid?.verticalLines.map((x, idx) => (
                      <g key={`v-${idx}`}>
                        <line x1={x} y1="0" x2={x} y2={deskewedCanvas.height} stroke="#f59e0b" strokeWidth="4" strokeDasharray="6 3" />
                        <circle cx={x} cy="24" r="10" fill="#f59e0b" cursor="pointer" onClick={() => handleDeleteVerticalLine(idx)} />
                        <text x={x + 5} y="40" fill="#f59e0b" fontSize="14" fontWeight="bold">V{idx + 1}</text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              <div className="grid-editor-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowGridEditor(false)}>
                  Annuler
                </button>
                <button type="button" className="btn-primary" onClick={handleApplyCustomGrid}>
                  <Check size={16} /> Appliquer et Reconstruire le Tableau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
