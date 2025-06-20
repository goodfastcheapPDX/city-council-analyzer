import { NextRequest, NextResponse } from 'next/server';
import { TranscriptStorage } from '@/lib/storage/blob';
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

/**
 * Creates transcript API handlers with dependency injection
 * This pattern separates business logic from Next.js adapter layer
 */
export function createTranscriptHandlers() {
    return {
        /**
         * Handler for GET /api/transcripts - List transcripts with pagination
         */
        async GET(request: NextRequest, storage: TranscriptStorage): Promise<NextResponse> {
            try {
                const { searchParams } = new URL(request.url);
                const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
                const cursor = searchParams.get('cursor') ? parseInt(searchParams.get('cursor')!, 10) : 0;

                const result = await storage.listTranscripts(limit, cursor);

                return NextResponse.json(result);
            } catch (error) {
                console.error('Error listing transcripts:', error);
                return NextResponse.json(
                    { error: 'Failed to list transcripts' },
                    { status: 500 }
                );
            }
        },

        /**
         * Handler for POST /api/transcripts - Upload new transcript
         */
        async POST(request: NextRequest, storage: TranscriptStorage): Promise<NextResponse> {
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
                const result = await storage.uploadTranscript(content, {
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
    };
}