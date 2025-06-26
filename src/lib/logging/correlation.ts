import { randomUUID } from 'crypto';

/**
 * Request correlation utilities for tracing requests across the application
 */

export interface CorrelationContext {
  /** Unique request identifier */
  correlationId: string;
  
  /** Parent correlation ID for nested operations */
  parentId?: string;
  
  /** Request start timestamp */
  startTime: number;
  
  /** Additional context metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Generate a new correlation ID using UUID v4
 */
export function generateCorrelationId(): string {
  return randomUUID();
}

/**
 * Create a new correlation context
 */
export function createCorrelationContext(
  parentId?: string,
  metadata?: Record<string, unknown>
): CorrelationContext {
  return {
    correlationId: generateCorrelationId(),
    parentId,
    startTime: Date.now(),
    metadata,
  };
}

/**
 * Create a child correlation context for nested operations
 */
export function createChildContext(
  parent: CorrelationContext,
  metadata?: Record<string, unknown>
): CorrelationContext {
  return createCorrelationContext(parent.correlationId, {
    ...parent.metadata,
    ...metadata,
  });
}

/**
 * Extract correlation ID from various sources
 */
export function extractCorrelationId(
  headers?: Record<string, string | string[]>,
  query?: Record<string, string>,
  existingContext?: CorrelationContext
): string {
  // Try existing context first
  if (existingContext?.correlationId) {
    return existingContext.correlationId;
  }
  
  // Try headers (common header names)
  if (headers) {
    const correlationHeaders = [
      'x-correlation-id',
      'x-request-id', 
      'x-trace-id',
      'correlation-id',
      'request-id',
    ];
    
    for (const headerName of correlationHeaders) {
      const value = headers[headerName];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }
  }
  
  // Try query parameters
  if (query?.correlationId) {
    return query.correlationId;
  }
  
  // Generate new ID if none found
  return generateCorrelationId();
}

/**
 * Context storage for managing correlation across async operations
 */
class CorrelationStore {
  private contexts = new Map<string, CorrelationContext>();
  
  /**
   * Store a correlation context
   */
  set(context: CorrelationContext): void {
    this.contexts.set(context.correlationId, context);
  }
  
  /**
   * Retrieve a correlation context
   */
  get(correlationId: string): CorrelationContext | undefined {
    return this.contexts.get(correlationId);
  }
  
  /**
   * Remove a correlation context
   */
  delete(correlationId: string): boolean {
    return this.contexts.delete(correlationId);
  }
  
  /**
   * Clear all contexts (useful for testing)
   */
  clear(): void {
    this.contexts.clear();
  }
  
  /**
   * Get all active correlation IDs
   */
  getActiveIds(): string[] {
    return Array.from(this.contexts.keys());
  }
  
  /**
   * Cleanup old contexts (older than specified time)
   */
  cleanup(maxAgeMs: number = 300000): number { // Default 5 minutes
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    
    for (const [id, context] of this.contexts.entries()) {
      if (context.startTime < cutoff) {
        this.contexts.delete(id);
        removed++;
      }
    }
    
    return removed;
  }
}

/**
 * Global correlation store instance
 */
export const correlationStore = new CorrelationStore();

/**
 * Correlation context utilities for async operations
 */
export const correlationUtils = {
  /**
   * Run an operation with correlation context
   */
  async withContext<T>(
    context: CorrelationContext,
    operation: (context: CorrelationContext) => Promise<T>
  ): Promise<T> {
    correlationStore.set(context);
    
    try {
      return await operation(context);
    } finally {
      // Don't delete immediately, keep for potential child operations
      // Cleanup will happen via the cleanup() method
    }
  },
  
  /**
   * Run a sync operation with correlation context
   */
  withContextSync<T>(
    context: CorrelationContext,
    operation: (context: CorrelationContext) => T
  ): T {
    correlationStore.set(context);
    
    try {
      return operation(context);
    } finally {
      // Don't delete immediately, keep for potential child operations
    }
  },
  
  /**
   * Get current correlation context by ID
   */
  getCurrentContext(correlationId: string): CorrelationContext | undefined {
    return correlationStore.get(correlationId);
  },
  
  /**
   * Create and store a new correlation context
   */
  createAndStore(parentId?: string, metadata?: Record<string, unknown>): CorrelationContext {
    const context = createCorrelationContext(parentId, metadata);
    correlationStore.set(context);
    return context;
  },
  
  /**
   * Cleanup old correlation contexts
   */
  cleanup(maxAgeMs?: number): number {
    return correlationStore.cleanup(maxAgeMs);
  },
};