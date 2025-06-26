/**
 * Standard log context structure for consistent logging across the application
 */
export interface LogContext {
  /** Request correlation ID for tracing requests across services */
  correlationId?: string;
  
  /** User ID or identifier when available */
  userId?: string;
  
  /** Operation being performed (e.g., 'upload_transcript', 'delete_blob') */
  operation?: string;
  
  /** Additional metadata relevant to the log entry */
  metadata?: Record<string, unknown>;
  
  /** Performance timing information */
  timing?: {
    startTime?: number;
    duration?: number;
    performanceMarks?: string[];
  };
  
  /** Error context when logging errors */
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string | number;
    statusCode?: number;
  };
}

/**
 * Performance timing utilities for structured logging
 */
export interface PerformanceTiming {
  /** Start time in milliseconds */
  startTime: number;
  
  /** Mark a performance milestone */
  mark(label: string): void;
  
  /** Get elapsed time since start */
  getElapsed(): number;
  
  /** Get all performance marks */
  getMarks(): string[];
  
  /** Complete timing and return context */
  complete(): LogContext['timing'];
}

/**
 * Log entry structure for consistent log formatting
 */
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
  timestamp?: Date;
  namespace?: string;
}

/**
 * Error categories for structured error logging
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  STORAGE = 'storage', 
  API = 'api',
  AUTHENTICATION = 'auth',
  EXTERNAL_SERVICE = 'external',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  PROCESSING = 'processing',
}

/**
 * Log level definitions with descriptions
 */
export const LogLevels = {
  DEBUG: 'debug' as const,
  INFO: 'info' as const,
  WARN: 'warn' as const,
  ERROR: 'error' as const,
  SILENT: 'silent' as const,
} as const;

/**
 * Common operation types for consistent operation naming
 */
export const Operations = {
  // Storage operations
  UPLOAD_TRANSCRIPT: 'upload_transcript',
  DELETE_TRANSCRIPT: 'delete_transcript',
  RETRIEVE_TRANSCRIPT: 'retrieve_transcript',
  LIST_TRANSCRIPTS: 'list_transcripts',
  UPDATE_TRANSCRIPT: 'update_transcript',
  
  // Blob operations
  UPLOAD_BLOB: 'upload_blob',
  DELETE_BLOB: 'delete_blob',
  RETRIEVE_BLOB: 'retrieve_blob',
  
  // Database operations
  DB_INSERT: 'db_insert',
  DB_UPDATE: 'db_update',
  DB_DELETE: 'db_delete',
  DB_SELECT: 'db_select',
  
  // API operations
  API_REQUEST: 'api_request',
  API_RESPONSE: 'api_response',
  
  // Processing operations
  PARSE_CONTENT: 'parse_content',
  VALIDATE_INPUT: 'validate_input',
  TRANSFORM_DATA: 'transform_data',
} as const;

export type OperationType = typeof Operations[keyof typeof Operations];