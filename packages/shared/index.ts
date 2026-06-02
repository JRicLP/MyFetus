export interface User {
  id: string; // Já pensando em UUID
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface SyncOperation {
  table: string;
  operation: 'create' | 'update' | 'delete';
  record: Record<string, unknown>;
  client_id: string;
  timestamp: string;
}

export interface ClinicalTermMappingCandidate {
  input: string;
  normalizedInput: string;
  normalizedAlias: string;
  status: 'mapped' | 'ambiguous' | 'unmapped';
  matchType?: 'exact' | 'partial';
  confidence: number;
  loinc?: string;
  canonicalTerm?: string;
  category?: string;
  specimen?: string;
  unit?: string;
  matchedAlias?: string;
  source: string;
  reason?: string;
}

export interface ClinicalMappingSummary {
  total: number;
  mapped: number;
  ambiguous: number;
  unmapped: number;
  coverage: number;
}

export interface ClinicalTextMappingResult {
  source: string;
  originalText: string;
  mappedTerms: ClinicalTermMappingCandidate[];
  summary: ClinicalMappingSummary;
}
