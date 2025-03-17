// app/api/transcripts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TranscriptBlobStorage } from '@/lib/storage/blob';
import { z } from 'zod';

// Initialize blob storage
const transcriptStorage = new TranscriptBlobStorage();

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
        const { searchParams } = new URL(request.url);
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
        const cursor = searchParams.get('cursor') || undefined;

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

// app/api/transcripts/[sourceId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TranscriptBlobStorage } from '@/lib/storage/blob';

// Initialize blob storage
const transcriptStorage = new TranscriptBlobStorage();

interface Params {
    params: {
        sourceId: string;
    };
}

// Handler for GET /api/transcripts/[sourceId]
export async function GET(request: NextRequest, { params }: Params) {
    try {
        const { searchParams } = new URL(request.url);
        const version = searchParams.get('version') ?
            parseInt(searchParams.get('version')!, 10) : undefined;
        const listVersions = searchParams.get('versions') === 'true';

        if (listVersions) {
            const versions = await transcriptStorage.listVersions(params.sourceId);
            return NextResponse.json(versions);
        }

        const transcript = await transcriptStorage.getTranscript(params.sourceId, version);
        return NextResponse.json(transcript);
    } catch (error) {
        console.error(`Error fetching transcript ${params.sourceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch transcript' },
            { status: 404 }
        );
    }
}

// Handler for DELETE /api/transcripts/[sourceId]
export async function DELETE(request: NextRequest, { params }: Params) {
    try {
        const { searchParams } = new URL(request.url);
        const version = searchParams.get('version') ?
            parseInt(searchParams.get('version')!, 10) : undefined;

        if (version) {
            await transcriptStorage.deleteTranscriptVersion(params.sourceId, version);
            return NextResponse.json({
                success: true,
                message: `Transcript ${params.sourceId} version ${version} deleted`
            });
        } else {
            await transcriptStorage.deleteAllVersions(params.sourceId);
            return NextResponse.json({
                success: true,
                message: `All versions of transcript ${params.sourceId} deleted`
            });
        }
    } catch (error) {
        console.error(`Error deleting transcript ${params.sourceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to delete transcript' },
            { status: 500 }
        );
    }
}

// Handler for PATCH /api/transcripts/[sourceId]
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const body = await request.json();
        const { version, status } = body;

        if (!version || !status) {
            return NextResponse.json(
                { error: 'Version and status are required' },
                { status: 400 }
            );
        }

        const updatedMetadata = await transcriptStorage.updateProcessingStatus(
            params.sourceId,
            version,
            status
        );

        return NextResponse.json(updatedMetadata);
    } catch (error) {
        console.error(`Error updating transcript ${params.sourceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to update transcript' },
            { status: 500 }
        );
    }
}