export interface ClassificationSuggestion {
  id: string;
  documentId: string;
  userId: string;
  proposedSubjectId?: string | null;
  proposedSubjectName?: string | null;
  proposedDocType: string;
  proposedSemesterId?: string | null;
  confidenceScore: number;
  explanation: string;
  source: string;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
}
