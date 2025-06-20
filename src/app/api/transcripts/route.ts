import { NextRequest } from 'next/server';
import { createStorageForServer } from '@/lib/storage/factories';
import { createTranscriptHandlers } from './handlers';

// Create handlers instance for business logic
const handlers = createTranscriptHandlers();

// Next.js API route exports - these maintain exact required signatures
export async function GET(request: NextRequest) {
    const storage = await createStorageForServer();
    return handlers.GET(request, storage);
}

export async function POST(request: NextRequest) {
    const storage = await createStorageForServer();
    return handlers.POST(request, storage);
}

