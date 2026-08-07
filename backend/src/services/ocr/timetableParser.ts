export interface RawParsedSession {
  detectedSubjectName: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  room?: string;
  sessionType?: 'CM' | 'TD' | 'TP' | 'EXAM' | 'OTHER';
}

const DAY_MAP: Record<string, number> = {
  lundi: 0, lun: 0,
  mardi: 1, mar: 1,
  mercredi: 2, mer: 2,
  jeudi: 3, jeu: 3,
  vendredi: 4, ven: 4,
  samedi: 5, sam: 5,
  dimanche: 6, dim: 6,
};

export function parseTimetableText(text: string): RawParsedSession[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: RawParsedSession[] = [];

  let currentDay: number | undefined = undefined;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Check if line specifies a day
    for (const [dayKey, dayVal] of Object.entries(DAY_MAP)) {
      if (lowerLine.includes(dayKey)) {
        currentDay = dayVal;
        break;
      }
    }

    // Match times: e.g. "08h30 - 10h30" or "8:30 à 10:30" or "08:00-10:00"
    const timeMatch = line.match(/(\d{1,2})[h:](\d{2})?\s*[-àa]\s*(\d{1,2})[h:](\d{2})?/i);

    if (timeMatch) {
      const sh = String(timeMatch[1]).padStart(2, '0');
      const sm = timeMatch[2] ? String(timeMatch[2]).padStart(2, '0') : '00';
      const eh = String(timeMatch[3]).padStart(2, '0');
      const em = timeMatch[4] ? String(timeMatch[4]).padStart(2, '0') : '00';

      const startTime = `${sh}:${sm}`;
      const endTime = `${eh}:${em}`;

      // Detect session type
      let sessionType: 'CM' | 'TD' | 'TP' | 'EXAM' | 'OTHER' = 'CM';
      if (/td|travaux dirigés/i.test(line)) sessionType = 'TD';
      else if (/tp|travaux pratiques/i.test(line)) sessionType = 'TP';
      else if (/exam|examen|contrôle/i.test(line)) sessionType = 'EXAM';
      else if (/cm|cours magistral/i.test(line)) sessionType = 'CM';

      // Detect room
      const roomMatch = line.match(/(amphi\s+[a-z0-9]+|salle\s+[a-z0-9]+|bâtiment\s+[a-z0-9]+|[a-z]\d{3})/i);
      const room = roomMatch ? roomMatch[0] : undefined;

      // Extract subject name by stripping time and type keywords
      let subjectName = line
        .replace(/(\d{1,2})[h:](\d{2})?\s*[-àa]\s*(\d{1,2})[h:](\d{2})?/gi, '')
        .replace(/\b(cm|td|tp|examen|exam|cours|travaux|dirigés|pratiques|salle|amphi)\b/gi, '')
        .trim();

      if (!subjectName || subjectName.length < 2) {
        subjectName = 'Cours d\'enseignement';
      }

      results.push({
        detectedSubjectName: subjectName,
        dayOfWeek: currentDay !== undefined ? currentDay : 0,
        startTime,
        endTime,
        room,
        sessionType,
      });
    }
  }

  // Fallback if no specific time pattern match was found
  if (results.length === 0 && lines.length > 0) {
    results.push({
      detectedSubjectName: lines[0] || 'Matière détectée',
      dayOfWeek: 0,
      startTime: '08:30',
      endTime: '10:30',
      sessionType: 'CM',
    });
  }

  return results;
}
