import { findBestSubjectMatch } from '../ocr/subjectMatcher';

export interface FilenameAnalysisResult {
  detectedDocType: string;
  matchedSubjectId: string | null;
  similarity: number;
  confidenceScore: number;
  explanation: string;
}

export function analyzeFilename(
  originalName: string,
  userSubjects: { id: string; name: string }[]
): FilenameAnalysisResult {
  // 1. Normalize filename
  const cleanName = originalName
    .replace(/\.[^/.]+$/, '') // remove extension
    .toLowerCase()
    .replace(/[-_.]/g, ' ')
    .trim();

  // 2. Detect docType by keywords
  let detectedDocType = 'cours'; // default fallback
  if (/\b(td|td\d+|travaux diriges|exercice|sheet)\b/i.test(cleanName)) {
    detectedDocType = 'TD';
  } else if (/\b(tp|tp\d+|travaux pratiques|lab|manip)\b/i.test(cleanName)) {
    detectedDocType = 'TP';
  } else if (/\b(exam|examen|partiel|ds|devoir|controle|test)\b/i.test(cleanName)) {
    detectedDocType = 'examen';
  } else if (/\b(cours|cm|lecture|chapitre|ch\d+)\b/i.test(cleanName)) {
    detectedDocType = 'cours';
  }

  // 3. Match subject
  const { matchedSubjectId, similarity } = findBestSubjectMatch(cleanName, userSubjects);

  // 4. Calculate score (0 to 100)
  let confidenceScore = 30; // base score
  if (detectedDocType !== 'autre') confidenceScore += 25;
  if (matchedSubjectId && similarity > 0.6) confidenceScore += 35;
  if (cleanName.length < 35) confidenceScore += 10;
  confidenceScore = Math.min(100, Math.max(0, confidenceScore));

  // 5. Generate human-readable explanation
  let explanation = '';
  const matchedSubject = userSubjects.find((s) => s.id === matchedSubjectId);

  if (matchedSubject) {
    explanation = `Nom contennant '${matchedSubject.name}' (type ${detectedDocType.toUpperCase()}) correspondant à la matière ${matchedSubject.name}.`;
  } else {
    explanation = `Type ${detectedDocType.toUpperCase()} détecté dans le nom. Aucune matière correspondante trouvée.`;
  }

  return {
    detectedDocType,
    matchedSubjectId,
    similarity,
    confidenceScore,
    explanation,
  };
}
