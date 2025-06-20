import { NextRequest, NextResponse } from 'next/server';
import { createStorageForServer } from '@/lib/storage/factories';
import { z } from 'zod';

// Schema for transcript upload
const transcriptUploadSchema = z.object({
    content: z.string().min(1, "Transcript content cannot be empty"),
    metadata: z.object({
        sourceId: z.string().optional(),
        title: z.string().min(1, "Title is required"),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        speakers: z.array(z.string()).min(1, "At least one speaker is required"),
        format: z.enum(['json', 'text', 'srt', 'vtt']).default('json'),
        tags: z.array(z.string()).optional()
    })
});

// Handler for GET /api/transcripts
export async function GET(request: NextRequest) {
    try {
        const transcriptStorage = await createStorageForServer();
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
        const cursor = searchParams.get('cursor') ? parseInt(searchParams.get('cursor')!, 10) : 0;

        const result = await transcriptStorage.listTranscripts(limit, cursor);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error listing transcripts:', error);
        return NextResponse.json(
            { error: 'Failed to list transcripts' },
            { status: 500 }
        );
    }
}

// Handler for POST /api/transcripts
export async function POST(request: NextRequest) {
    try {
        const transcriptStorage = await createStorageForServer();
        const body = await request.json();

        // Validate request body
        const validated = transcriptUploadSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { error: 'Invalid request body', details: validated.error.format() },
                { status: 400 }
            );
        }

        const { content, metadata } = validated.data;

        // Generate sourceId if not provided
        const sourceId = metadata.sourceId || `transcript_${Date.now()}`;

        // Upload transcript to blob storage
        const result = await transcriptStorage.uploadTranscript(content, {
            ...metadata,
            processingStatus: 'pending',
            sourceId
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error uploading transcript:', error);
        return NextResponse.json(
            { error: 'Failed to upload transcript' },
            { status: 500 }
        );
    }
}

