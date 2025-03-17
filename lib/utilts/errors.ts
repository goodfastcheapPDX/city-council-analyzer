// lib/utils/errors.ts
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

// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Error handling middleware for API routes
 */
export function errorHandlingMiddleware(request: NextRequest, context: any) {
    try {
        return context.next();
    } catch (error) {
        console.error('Unhandled error in middleware:', error);

        // Handle different error types
        if (error instanceof Error) {
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

// app/api/error.ts
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errors';

/**
 * Helper function to handle errors in API routes
 */
export async function withErrorHandling(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
    try {
        return await handler(request);
    } catch (error) {
        const { statusCode, errorResponse } = handleApiError(error);
        return NextResponse.json(errorResponse, { status: statusCode });
    }
}

// Usage example for API routes:
/*
import { NextRequest } from 'next/server';
import { withErrorHandling } from '@/app/api/error';
import { NotFoundError } from '@/lib/utils/errors';

export async function GET(request: NextRequest) {
  return withErrorHandling(request, async () => {
    // API handler logic
    throw new NotFoundError('Transcript not found');
  });
}
*/

// components/ui/ErrorDisplay.tsx
'use client';

import { useState } from 'react';
import { AlertCircle, XCircle } from 'lucide-react';

interface ErrorDisplayProps {
    title?: string;
    message: string;
    details?: any;
    onClose?: () => void;
    variant?: 'error' | 'warning' | 'info';
}

export function ErrorDisplay({
    title,
    message,
    details,
    onClose,
    variant = 'error'
}: ErrorDisplayProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [showDetails, setShowDetails] = useState(false);

    if (!isOpen) {
        return null;
    }

    const handleClose = () => {
        setIsOpen(false);
        if (onClose) {
            onClose();
        }
    };

    // Set colors based on variant
    const colors = {
        error: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            title: 'text-red-800',
            text: 'text-red-700',
            icon: 'text-red-500'
        },
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            title: 'text-yellow-800',
            text: 'text-yellow-700',
            icon: 'text-yellow-500'
        },
        info: {
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            title: 'text-blue-800',
            text: 'text-blue-700',
            icon: 'text-blue-500'
        }
    };

    const currentColors = colors[variant];

    return (
        <div className= {`rounded-md ${currentColors.bg} ${currentColors.border} border p-4 mb-4`
}>
    <div className="flex justify-between items-start" >
        <div className="flex" >
            <AlertCircle className={ `h-5 w-5 ${currentColors.icon} mt-0.5 mr-2 flex-shrink-0` } />
                <div>
{ title && <h3 className={ `text-sm font-medium ${currentColors.title}` }> { title } </h3> }
<div className={ `text-sm ${currentColors.text} mt-1` }>
    <p>{ message } </p>
    </div>

{
    details && (
        <div className="mt-2" >
            <button
                    type="button"
    className = {`text-xs underline ${currentColors.text}`
}
onClick = {() => setShowDetails(!showDetails)}
                  >
    { showDetails? 'Hide details': 'Show details' }
    </button>

{
    showDetails && (
        <pre className={ `mt-2 text-xs p-2 rounded ${currentColors.bg} bg-opacity-50 overflow-auto max-h-40` }>
            { typeof details === 'string' ? details : JSON.stringify(details, null, 2) }
            </pre>
                  )
}
</div>
              )}
</div>
    </div>

    < button
type = "button"
className = "text-gray-400 hover:text-gray-500"
onClick = { handleClose }
    >
    <XCircle className="h-5 w-5" />
        </button>
        </div>
        </div>
    );
  }