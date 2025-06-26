import { NextRequest, NextResponse } from 'next/server';
import { 
  createCorrelationContext, 
  extractCorrelationId, 
  correlationUtils,
  type CorrelationContext 
} from './correlation';
import { createLogger } from './factory';
import { createPerformanceTimer } from './performance';

/**
 * Extended request with correlation context
 */
export interface CorrelatedRequest extends NextRequest {
  correlation?: CorrelationContext;
}

/**
 * Response with correlation headers
 */
export interface CorrelatedResponse extends NextResponse {
  correlation?: CorrelationContext;
}

/**
 * Middleware options for correlation
 */
export interface CorrelationMiddlewareOptions {
  /** Custom header name for correlation ID */
  headerName?: string;
  
  /** Whether to log request/response automatically */
  enableLogging?: boolean;
  
  /** Logger namespace for middleware */
  loggerNamespace?: string;
  
  /** Whether to include performance timing */
  enableTiming?: boolean;
  
  /** Custom metadata extractor */
  extractMetadata?: (request: NextRequest) => Record<string, unknown>;
}

/**
 * Default middleware options
 */
const DEFAULT_OPTIONS: CorrelationMiddlewareOptions = {
  headerName: 'x-correlation-id',
  enableLogging: true,
  loggerNamespace: 'middleware',
  enableTiming: true,
};

/**
 * Create correlation middleware for Next.js API routes
 */
export function createCorrelationMiddleware(options: CorrelationMiddlewareOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const logger = createLogger({ namespace: config.loggerNamespace });
  
  return async function correlationMiddleware(
    request: NextRequest,
    handler: (req: CorrelatedRequest) => Promise<NextResponse>
  ): Promise<CorrelatedResponse> {
    const timer = config.enableTiming ? createPerformanceTimer() : null;
    
    // Extract or generate correlation ID
    const headers = Object.fromEntries(request.headers.entries());
    const correlationId = extractCorrelationId(headers);
    
    // Extract metadata
    const metadata = config.extractMetadata ? config.extractMetadata(request) : {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
    };
    
    // Create correlation context
    const context = createCorrelationContext(undefined, metadata);
    context.correlationId = correlationId; // Use extracted/existing ID
    
    // Add correlation to request
    const correlatedRequest = request as CorrelatedRequest;
    correlatedRequest.correlation = context;
    
    // Log request start
    if (config.enableLogging) {
      logger.info('Request started', {
        correlationId: context.correlationId,
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString(),
      });
    }
    
    timer?.mark('request_processing_start');
    
    try {
      // Execute handler with correlation context
      const response = await correlationUtils.withContext(context, async () => {
        return await handler(correlatedRequest);
      });
      
      timer?.mark('request_processing_complete');
      
      // Add correlation header to response
      response.headers.set(config.headerName!, context.correlationId);
      
      // Add timing information if enabled
      if (timer && config.enableTiming) {
        const timing = timer.complete();
        response.headers.set('x-request-timing', `${timing.duration}ms`);
        
        if (config.enableLogging) {
          logger.info('Request completed', {
            correlationId: context.correlationId,
            duration: timing.duration,
            status: response.status,
            timing: timing.performanceMarks,
          });
        }
      } else if (config.enableLogging) {
        logger.info('Request completed', {
          correlationId: context.correlationId,
          status: response.status,
        });
      }
      
      // Add correlation to response
      const correlatedResponse = response as CorrelatedResponse;
      correlatedResponse.correlation = context;
      
      return correlatedResponse;
      
    } catch (error) {
      timer?.mark('request_error');
      
      if (config.enableLogging) {
        logger.error('Request failed', {
          correlationId: context.correlationId,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          } : String(error),
          duration: timer?.getElapsed(),
        });
      }
      
      // Re-throw error for normal error handling
      throw error;
    }
  };
}

/**
 * Simple correlation middleware factory with sensible defaults
 */
export const withCorrelation = createCorrelationMiddleware();

/**
 * Utility to get correlation context from a request
 */
export function getRequestCorrelation(request: CorrelatedRequest): CorrelationContext | undefined {
  return request.correlation;
}

/**
 * Utility to create a child context for nested operations
 */
export function createChildCorrelation(
  request: CorrelatedRequest,
  operation: string,
  metadata?: Record<string, unknown>
): CorrelationContext | undefined {
  const parent = request.correlation;
  if (!parent) return undefined;
  
  return createCorrelationContext(parent.correlationId, {
    ...parent.metadata,
    operation,
    ...metadata,
  });
}

/**
 * Higher-order function to wrap API handlers with correlation
 */
export function withCorrelatedHandler<T = any>(
  handler: (req: CorrelatedRequest) => Promise<NextResponse<T>>,
  options?: CorrelationMiddlewareOptions
) {
  const middleware = createCorrelationMiddleware(options);
  
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    return await middleware(request, handler);
  };
}

/**
 * Utility to extract correlation information for logging
 */
export function getLoggingContext(request: CorrelatedRequest): Record<string, unknown> {
  const correlation = request.correlation;
  
  if (!correlation) {
    return {};
  }
  
  return {
    correlationId: correlation.correlationId,
    parentId: correlation.parentId,
    requestStartTime: correlation.startTime,
    metadata: correlation.metadata,
  };
}