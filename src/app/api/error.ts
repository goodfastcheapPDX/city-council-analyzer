import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/utils/errors';

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