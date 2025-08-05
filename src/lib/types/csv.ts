// CSV import types - compatibility layer for existing imports
// This file provides backward compatibility for existing CSV import functionality

import { 
  COMPREHENSIVE_CSV_HEADERS,
  ComprehensiveCSVRow,
  type CSVRow as EnhancedCSVRow
} from './csv-enhanced';

// Re-export the comprehensive format as the default CSV format
export const CSV_HEADERS = COMPREHENSIVE_CSV_HEADERS;
export type CSVRow = ComprehensiveCSVRow;

// Also re-export all enhanced types for future use
export * from './csv-enhanced';