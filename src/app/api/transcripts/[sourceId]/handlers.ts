import { NextRequest, NextResponse } from 'next/server';
import { TranscriptStorage } from '@/lib/storage/blob';

type Params = { params: Promise<{ sourceId: string }> }

/**
 * Creates transcript sourceId API handlers with dependency injection
 * This pattern separates business logic from Next.js adapter layer
 */
export function createTranscriptSourceIdHandlers() {
    return {
        /**
         * Handler for GET /api/transcripts/[sourceId] - Get specific transcript or list versions
         */
        async GET(request: NextRequest, { params }: Params, storage: TranscriptStorage): Promise<NextResponse> {
            const { sourceId } = await params;
            try {
                const { searchParams } = new URL(request.nextUrl);
                const version = searchParams.get('version') ?
                    parseInt(searchParams.get('version')!, 10) : undefined;
                const listVersions = searchParams.get('versions') === 'true';

                if (listVersions) {
                    const versions = await storage.listVersions(sourceId);
                    return NextResponse.json(versions);
                }

                const transcript = await storage.getTranscript(sourceId, version);
                return NextResponse.json(transcript);
            } catch (error) {
                console.error(`Error fetching transcript ${sourceId}:`, error);
                return NextResponse.json(
                    { error: 'Failed to fetch transcript' },
                    { status: 404 }
                );
            }
        },

        /**
         * Handler for DELETE /api/transcripts/[sourceId] - Delete transcript or specific version
         */
        async DELETE(request: NextRequest, { params }: Params, storage: TranscriptStorage): Promise<NextResponse> {
            const { sourceId } = await params;
            try {
                const { searchParams } = new URL(request.url);
                const version = searchParams.get('version') ?
                    parseInt(searchParams.get('version')!, 10) : undefined;

                if (version) {
                    await storage.deleteTranscriptVersion(sourceId, version);
                    return NextResponse.json({
                        success: true,
                        message: `Transcript ${sourceId} version ${version} deleted`
                    });
                } else {
                    await storage.deleteAllVersions(sourceId);
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
        },

        /**
         * Handler for PATCH /api/transcripts/[sourceId] - Update transcript processing status
         */
        async PATCH(request: NextRequest, { params }: Params, storage: TranscriptStorage): Promise<NextResponse> {
            const { sourceId } = await params;
            try {
                const body = await request.json();
                const { version, status } = body;

                if (!version || !status) {
                    return NextResponse.json(
                        { error: 'Version and status are required' },
                        { status: 400 }
                    );
                }

                const updatedMetadata = await storage.updateProcessingStatus(
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
    };
}