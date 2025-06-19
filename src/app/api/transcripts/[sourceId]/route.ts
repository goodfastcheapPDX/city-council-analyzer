import { NextRequest, NextResponse } from 'next/server';
import { createStorageForServer } from '@/lib/storage/factories'

type Params = { params: Promise<{ sourceId: string }> }

// Handler for GET /api/transcripts/[sourceId]
export async function GET(request: NextRequest, { params }: Params
) {
    const transcriptStorage = await createStorageForServer();
    const { sourceId } = await params
    try {
        const { searchParams } = new URL(request.nextUrl);
        const version = searchParams.get('version') ?
            parseInt(searchParams.get('version')!, 10) : undefined;
        const listVersions = searchParams.get('versions') === 'true';

        if (listVersions) {
            const versions = await transcriptStorage.listVersions(sourceId);
            return NextResponse.json(versions);
        }

        const transcript = await transcriptStorage.getTranscript(sourceId, version);
        return NextResponse.json(transcript);
    } catch (error) {
        console.error(`Error fetching transcript ${sourceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch transcript' },
            { status: 404 }
        );
    }
}

// Handler for DELETE /api/transcripts/[sourceId]
export async function DELETE(request: NextRequest, { params }: Params) {
    const transcriptStorage = await createStorageForServer();
    const { sourceId } = await params
    try {
        const { searchParams } = new URL(request.url);
        const version = searchParams.get('version') ?
            parseInt(searchParams.get('version')!, 10) : undefined;

        if (version) {
            await transcriptStorage.deleteTranscriptVersion(sourceId, version);
            return NextResponse.json({
                success: true,
                message: `Transcript ${sourceId} version ${version} deleted`
            });
        } else {
            await transcriptStorage.deleteAllVersions(sourceId);
            return NextResponse.json({
                success: true,
                message: `All versions of transcript ${sourceId} deleted`
            });
        }
    } catch (error) {
        console.error(`Error deleting transcript ${sourceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to delete transcript' },
            { status: 500 }
        );
    }
}

// Handler for PATCH /api/transcripts/[sourceId]
export async function PATCH(request: NextRequest, { params }: Params) {
    const transcriptStorage = await createStorageForServer();

    const { sourceId } = await params
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
            sourceId,
            version,
            status
        );

        return NextResponse.json(updatedMetadata);
    } catch (error) {
        console.error(`Error updating transcript ${sourceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to update transcript' },
            { status: 500 }
        );
    }
}