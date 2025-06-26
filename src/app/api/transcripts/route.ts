import { NextRequest } from 'next/server';
import { createStorageForServer } from '@/lib/storage/factories/server';
import { withCorrelatedHandler } from '@/lib/logging/middleware';
import { createTranscriptHandlers } from './handlers';

// Create handlers instance for business logic
const handlers = createTranscriptHandlers();

// Next.js API route exports with correlation middleware integration
export const GET = withCorrelatedHandler(async (request: NextRequest) => {
    const storage = createStorageForServer();
    return handlers.GET(request, storage);
}, {
    loggerNamespace: 'api.transcripts.list',
    enableTiming: true,
    extractMetadata: (req) => ({
        endpoint: 'GET /api/transcripts',
        userAgent: req.headers.get('user-agent'),
        referer: req.headers.get('referer'),
    })
});

export const POST = withCorrelatedHandler(async (request: NextRequest) => {
    const storage = createStorageForServer();
    return handlers.POST(request, storage);
}, {
    loggerNamespace: 'api.transcripts.upload',
    enableTiming: true,
    extractMetadata: (req) => ({
        endpoint: 'POST /api/transcripts',
        contentType: req.headers.get('content-type'),
        userAgent: req.headers.get('user-agent'),
    })
});

