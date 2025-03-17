// app/api/upload-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import { config } from '@/lib/config';
import { TranscriptBlobStorage, TranscriptMetadata } from '@/lib/storage/blob';
import { TranscriptProcessor } from '@/lib/storage/transcript-processor';

// Initialize services
const blobStorage = new TranscriptBlobStorage(config.blob.transcriptPathPrefix);
const processor = new TranscriptProcessor(blobStorage);

/**
 * Schema for upload URL request
 */
interface UploadUrlRequest {
    filename: string;
    contentType: string;
    metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version' | 'processingStatus'>;
}

/**
 * Handler for GET /api/upload-url
 * Generates a presigned URL for client-side uploads
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');
        const contentType = searchParams.get('contentType') || 'application/json';

        if (!filename) {
            return NextResponse.json(
                { error: 'Filename is required' },
                { status: 400 }
            );
        }

        // Generate unique path
        const sourceId = `upload_${nanoid(10)}`;
        const path = `${config.blob.transcriptPathPrefix}/${sourceId}/v1_${nanoid(8)}`;

        // Generate presigned URL with expiration
        const { url, uploadUrl } = await put(path, {
            access: config.blob.allowPublicAccess ? 'public' : 'private',
            contentType,
            multipart: true,
            metadata: {
                sourceId,
                version: '1',
                uploadedAt: new Date().toISOString(),
                processingStatus: 'pending',
                filename
            }
        });

        return NextResponse.json({ url, uploadUrl, sourceId });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}

/**
 * Handler for POST /api/upload-url
 * Creates an upload URL with metadata
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as UploadUrlRequest;

        if (!body.filename || !body.contentType || !body.metadata) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        // Generate unique path
        const sourceId = body.metadata.sourceId || `upload_${nanoid(10)}`;
        const path = `${config.blob.transcriptPathPrefix}/${sourceId}/v1_${nanoid(8)}`;

        // Generate presigned URL with expiration and metadata
        const { url, uploadUrl } = await put(path, {
            access: config.blob.allowPublicAccess ? 'public' : 'private',
            contentType: body.contentType,
            multipart: true,
            metadata: {
                ...body.metadata,
                sourceId,
                version: '1',
                uploadedAt: new Date().toISOString(),
                processingStatus: 'pending',
                filename: body.filename,
                speakers: JSON.stringify(body.metadata.speakers || []),
                tags: body.metadata.tags ? JSON.stringify(body.metadata.tags) : '[]'
            },
            expiresIn: config.blob.expirationSeconds
        });

        return NextResponse.json({
            url,
            uploadUrl,
            sourceId,
            metadata: {
                ...body.metadata,
                sourceId,
                version: 1,
                processingStatus: 'pending' as const,
                uploadedAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error generating upload URL with metadata:', error);
        return NextResponse.json(
            { error: 'Failed to generate upload URL' },
            { status: 500 }
        );
    }
}

// app/api/process-transcript/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TranscriptBlobStorage } from '@/lib/storage/blob';
import { TranscriptProcessor } from '@/lib/storage/transcript-processor';
import { config } from '@/lib/config';

// Initialize services
const blobStorage = new TranscriptBlobStorage(config.blob.transcriptPathPrefix);
const processor = new TranscriptProcessor(blobStorage);

/**
 * Handler for POST /api/process-transcript
 * Triggers processing of a transcript
 */
export async function POST(request: NextRequest) {
    // Check if processing is enabled
    if (process.env.ENABLE_PROCESSING !== 'true') {
        return NextResponse.json(
            { error: 'Processing is disabled. Enable with ENABLE_PROCESSING=true' },
            { status: 503 }
        );
    }

    try {
        const body = await request.json();

        if (!body.sourceId || !body.version) {
            return NextResponse.json(
                { error: 'Source ID and version are required' },
                { status: 400 }
            );
        }

        const sourceId = body.sourceId;
        const version = parseInt(body.version, 10);

        // Queue transcript for processing
        const result = await processor.processTranscript(sourceId, version);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Processing failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            metadata: result.metadata
        });
    } catch (error) {
        console.error('Error processing transcript:', error);
        return NextResponse.json(
            { error: 'Failed to process transcript' },
            { status: 500 }
        );
    }