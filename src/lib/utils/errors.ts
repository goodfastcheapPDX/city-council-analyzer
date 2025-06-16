/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
    /**
     * HTTP status code
     */
    statusCode: number;

    /**
     * Additional error details for structured error responses
     */
    details?: Record<string, any>;

    /**
     * Constructor for AppError
     * @param message Error message
     * @param statusCode HTTP status code
     * @param details Additional error details
     */
    constructor(message: string, statusCode: number = 500, details?: Record<string, any>) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found', details?: Record<string, any>) {
        super(message, 404, details);
        this.name = 'NotFoundError';
    }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
    constructor(message: string = 'Validation failed', details?: Record<string, any>) {
        super(message, 400, details);
        this.name = 'ValidationError';
    }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
        super(message, 401, details);
        this.name = 'AuthenticationError';
    }
}

/**
 * Error thrown when authorization fails
 */
export class AuthorizationError extends AppError {
    constructor(message: string = 'Authorization failed', details?: Record<string, any>) {
        super(message, 403, details);
        this.name = 'AuthorizationError';
    }
}

/**
 * Error thrown when a service is unavailable
 */
export class ServiceUnavailableError extends AppError {
    constructor(message: string = 'Service unavailable', details?: Record<string, any>) {
        super(message, 503, details);
        this.name = 'ServiceUnavailableError';
    }
}

/**
 * Error thrown when a rate limit is exceeded
 */
export class RateLimitError extends AppError {
    constructor(message: string = 'Rate limit exceeded', details?: Record<string, any>) {
        super(message, 429, details);
        this.name = 'RateLimitError';
    }
}

/**
 * Handle errors in API routes
 */
export function handleApiError(error: any) {
    console.error('API Error:', error);

    // Determine the status code
    let statusCode = 500;
    let message = 'Internal server error';
    let details: Record<string, any> | undefined = undefined;

    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        details = error.details;
    } else if (error instanceof Error) {
        message = error.message;
    }

    // Construct error response
    const errorResponse = {
        error: message,
        ...(details && { details })
    };

    return { statusCode, errorResponse };
}
