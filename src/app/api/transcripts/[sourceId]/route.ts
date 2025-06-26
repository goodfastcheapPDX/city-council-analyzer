import { NextRequest } from 'next/server';
import { createStorageForServer } from '@/lib/storage/factories/server';
import { createTranscriptSourceIdHandlers } from './handlers';

type Params = { params: Promise<{ sourceId: string }> }

// Create handlers instance for business logic
const handlers = createTranscriptSourceIdHandlers();

// Next.js API route exports - these maintain exact required signatures
export async function GET(request: NextRequest, { params }: Params) {
    const storage = createStorageForServer();
    return handlers.GET(request, { params }, storage);
}

export async function DELETE(request: NextRequest, { params }: Params) {
    const storage = createStorageForServer();
    return handlers.DELETE(request, { params }, storage);
}

export async function PATCH(request: NextRequest, { params }: Params) {
    const storage = createStorageForServer();
    return handlers.PATCH(request, { params }, storage);
}