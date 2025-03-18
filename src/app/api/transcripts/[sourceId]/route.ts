// app/api/transcripts/[sourceId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TranscriptStorage } from '@/lib/storage/blob';

// Initialize blob storage
const transcriptStorage = new TranscriptStorage();

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