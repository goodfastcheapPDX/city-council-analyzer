/**
 * Centralized logging system for the transcript analysis application
 * 
 * This module provides:
 * - Environment-aware logging configuration
 * - Structured logging with correlation IDs
 * - Performance timing utilities
 * - Type-safe logging contexts
 * - Pre-configured logger instances for common use cases
 */

// Core factory and configuration
export {
  createLogger,
  createNamespacedLogger,
  LoggerFactory,
  logger,
  apiLogger,
  storageLogger,
  errorLogger,
} from './factory';

export type {
  LogEnvironment,
  LogLevel,
  LoggerConfig,
} from './factory';

// Types and interfaces
export type {
  LogContext,
  LogEntry,
  PerformanceTiming,
  OperationType,
} from './types';

export {
  ErrorCategory,
  LogLevels,
  Operations,
} from './types';

// Performance timing utilities
export {
  PerformanceTimer,
  createPerformanceTimer,
  timeOperation,
  timeSync,
} from './performance';

// Correlation and context utilities
export {
  generateCorrelationId,
  createCorrelationContext,
  createChildContext,
  extractCorrelationId,
  correlationStore,
  correlationUtils,
} from './correlation';

export type {
  CorrelationContext,
} from './correlation';

// Middleware utilities
export {
  createCorrelationMiddleware,
  withCorrelation,
  getRequestCorrelation,
  createChildCorrelation,
  withCorrelatedHandler,
  getLoggingContext,
} from './middleware';

export type {
  CorrelatedRequest,
  CorrelatedResponse,
  CorrelationMiddlewareOptions,
} from './middleware';

// Configuration utilities
export {
  getLogLevel,
  getNamespaces,
  isJsonFormattingEnabled,
  areColorsEnabled,
  areTimestampsEnabled,
  isCorrelationEnabled,
  isTimingEnabled,
  getTimingThreshold,
  getCorrelationMaxAge,
  getCorrelationHeaders,
  getAlwaysTimedOperations,
  getConditionallyTimedOperations,
  shouldTimeOperation,
  getEnvironmentConfig,
  createNamespaceConfig,
  shouldLog,
  getFullLoggingConfig,
} from './config';

/**
 * Quick-access logger instances for common use cases
 * 
 * @example
 * ```typescript
 * import { quickLoggers } from '@/lib/logging';
 * 
 * // API operations
 * quickLoggers.api.info('Processing upload request', { correlationId: 'abc123' });
 * 
 * // Storage operations  
 * quickLoggers.storage.debug('Blob uploaded successfully', { blobKey: 'key', size: 1024 });
 * ```
 */
export const quickLoggers = {
  api: apiLogger,
  storage: storageLogger,
  error: errorLogger,
  general: logger,
} as const;

/**
 * Utility functions for common logging patterns
 */
export const logUtils = {
  /**
   * Create a performance timing context for operations
   */
  createTiming: createPerformanceTimer,
  
  /**
   * Time an async operation and return results with timing
   */
  timeAsync: timeOperation,
  
  /**
   * Time a sync operation and return results with timing
   */
  timeSync: timeSync,
  
  /**
   * Create error context from an error object
   */
  createErrorContext: (error: Error | unknown): LogContext['error'] => {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    
    return {
      message: String(error),
    };
  },
  
  /**
   * Create a standard log context with correlation ID
   */
  createContext: (correlationId: string, operation?: string, metadata?: Record<string, unknown>): LogContext => ({
    correlationId,
    operation,
    metadata,
  }),
};