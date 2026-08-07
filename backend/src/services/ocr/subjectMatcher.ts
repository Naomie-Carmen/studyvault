export function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return track[str2.length][str1.length];
}

export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0;

  const maxLength = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);

  return 1 - distance / maxLength;
}

export function findBestSubjectMatch(
  detectedName: string,
  userSubjects: { id: string; name: string }[]
): { matchedSubjectId: string | null; similarity: number } {
  let bestMatchId: string | null = null;
  let highestSimilarity = 0;

  const detectedTokens = detectedName.toLowerCase().split(/[\s_.-]+/).filter((w) => w.length > 2);

  for (const subject of userSubjects) {
    const subjectTokens = subject.name.toLowerCase().split(/[\s_.-]+/).filter((w) => w.length > 2);

    // 1. Direct Levenshtein similarity
    const baseSim = calculateSimilarity(detectedName, subject.name);
    let score = baseSim;

    // 2. Token overlap matching (e.g. "Algorithmique" in both)
    const tokenMatch = subjectTokens.some((t) =>
      detectedTokens.some((d) => d.includes(t) || t.includes(d) || calculateSimilarity(d, t) > 0.75)
    );

    if (tokenMatch) {
      score = Math.max(score, 0.85);
    }

    if (score > highestSimilarity) {
      highestSimilarity = score;
      bestMatchId = subject.id;
    }
  }

  return {
    matchedSubjectId: highestSimilarity >= 0.5 ? bestMatchId : null,
    similarity: highestSimilarity,
  };
}
