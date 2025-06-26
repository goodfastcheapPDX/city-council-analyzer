import { NextRequest } from 'next/server';
import { createStorageForServer } from '@/lib/storage/factories/server';
import { withCorrelatedHandler } from '@/lib/logging/middleware';
import { createTranscriptSourceIdHandlers } from './handlers';

type Params = { params: Promise<{ sourceId: string }> }

// Create handlers instance for business logic
const handlers = createTranscriptSourceIdHandlers();

// Next.js API route exports with correlation middleware integration
export async function GET(request: NextRequest, { params }: Params) {
    const sourceIdParam = await params;
    
    return withCorrelatedHandler(async (correlatedRequest: NextRequest) => {
        const storage = createStorageForServer();
        return handlers.GET(correlatedRequest, { params }, storage);
    }, {
        loggerNamespace: 'api.transcripts.get',
        enableTiming: true,
        extractMetadata: (req) => ({
            endpoint: `GET /api/transcripts/${sourceIdParam.sourceId}`,
            sourceId: sourceIdParam.sourceId,
            userAgent: req.headers.get('user-agent'),
        })
    })(request);
}

export async function DELETE(request: NextRequest, { params }: Params) {
    const sourceIdParam = await params;
    
    return withCorrelatedHandler(async (correlatedRequest: NextRequest) => {
        const storage = createStorageForServer();
        return handlers.DELETE(correlatedRequest, { params }, storage);
    }, {
        loggerNamespace: 'api.transcripts.delete',
        enableTiming: true,
        extractMetadata: (req) => ({
            endpoint: `DELETE /api/transcripts/${sourceIdParam.sourceId}`,
            sourceId: sourceIdParam.sourceId,
            userAgent: req.headers.get('user-agent'),
        })
    })(request);
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const sourceIdParam = await params;
    
    return withCorrelatedHandler(async (correlatedRequest: NextRequest) => {
        const storage = createStorageForServer();
        return handlers.PATCH(correlatedRequest, { params }, storage);
    }, {
        loggerNamespace: 'api.transcripts.update',
        enableTiming: true,
        extractMetadata: (req) => ({
            endpoint: `PATCH /api/transcripts/${sourceIdParam.sourceId}`,
            sourceId: sourceIdParam.sourceId,
            userAgent: req.headers.get('user-agent'),
        })
    })(request);
}