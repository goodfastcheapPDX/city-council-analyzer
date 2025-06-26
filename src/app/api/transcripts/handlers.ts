import { NextRequest, NextResponse } from 'next/server';
import { TranscriptStorage } from '@/lib/storage/blob';
import { dateUtils } from '@/lib/config';
import { randomUUID } from 'crypto'; // Used for collision-free, URL-safe transcript ID generation
import { z } from 'zod';
import { createLogger } from '@/lib/logging/factory';
import { getRequestCorrelation, type CorrelatedRequest } from '@/lib/logging/middleware';
import { timeOperation } from '@/lib/logging/performance';

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
            const logger = createLogger({ namespace: 'api.transcripts.list' });
            const correlation = getRequestCorrelation(request as CorrelatedRequest);
            
            try {
                const { searchParams } = new URL(request.url);
                const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10;
                const cursor = searchParams.get('cursor') ? parseInt(searchParams.get('cursor')!, 10) : 0;

                logger.info('Listing transcripts', {
                    correlationId: correlation?.correlationId,
                    limit,
                    cursor,
                    endpoint: 'GET /api/transcripts'
                });

                // Time the storage operation as it may be >100ms for large datasets
                const { result, timing } = await timeOperation(
                    () => storage.listTranscripts(limit, cursor),
                    'storage_list_transcripts'
                );

                logger.info('Successfully listed transcripts', {
                    correlationId: correlation?.correlationId,
                    count: result.items.length,
                    total: result.total,
                    timing: timing
                });

                return NextResponse.json(result);
            } catch (error) {
                logger.error('Failed to list transcripts', {
                    correlationId: correlation?.correlationId,
                    error: error instanceof Error ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    } : String(error),
                    endpoint: 'GET /api/transcripts'
                });
                
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
            const logger = createLogger({ namespace: 'api.transcripts.upload' });
            const correlation = getRequestCorrelation(request as CorrelatedRequest);
            
            try {
                // Time JSON parsing as it may be >100ms for large transcripts
                const { result: body, timing: parseTimimg } = await timeOperation(
                    () => request.json(),
                    'json_parse'
                );

                logger.info('Processing transcript upload', {
                    correlationId: correlation?.correlationId,
                    endpoint: 'POST /api/transcripts',
                    hasContent: !!body.content,
                    hasMetadata: !!body.metadata,
                    parseTime: parseTimimg
                });

                // Time validation as it may be >100ms for complex schemas with large content
                const { result: validated, timing: validationTiming } = await timeOperation(
                    () => Promise.resolve(transcriptUploadSchema.safeParse(body)),
                    'schema_validation'
                );

                if (!validated.success) {
                    logger.warn('Invalid upload request body', {
                        correlationId: correlation?.correlationId,
                        validationErrors: validated.error.format(),
                        endpoint: 'POST /api/transcripts',
                        validationTime: validationTiming
                    });
                    
                    return NextResponse.json(
                        { error: 'Invalid request body', details: validated.error.format() },
                        { status: 400 }
                    );
                }

                const { content, metadata } = validated.data;

                // Generate sourceId if not provided
                const sourceId = metadata.sourceId || `transcript_${randomUUID()}`;

                logger.info('Uploading transcript to storage', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    title: metadata.title,
                    format: metadata.format,
                    speakerCount: metadata.speakers.length,
                    contentSize: content.length
                });

                // Time the storage upload as it may be >100ms for large transcripts
                const { result, timing: uploadTiming } = await timeOperation(
                    () => storage.uploadTranscript(content, {
                        ...metadata,
                        processingStatus: 'pending',
                        sourceId
                    }),
                    'storage_upload_transcript'
                );

                logger.info('Successfully uploaded transcript', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    version: result.metadata.version,
                    blobKey: result.blobKey,
                    url: result.url,
                    timing: uploadTiming
                });

                return NextResponse.json(result);
            } catch (error) {
                logger.error('Failed to upload transcript', {
                    correlationId: correlation?.correlationId,
                    error: error instanceof Error ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    } : String(error),
                    endpoint: 'POST /api/transcripts'
                });
                
                return NextResponse.json(
                    { error: 'Failed to upload transcript' },
                    { status: 500 }
                );
            }
        }
    };
}