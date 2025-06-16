import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Error handling middleware for API routes
 */
export function errorHandlingMiddleware(_request: NextRequest, context: any) {
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