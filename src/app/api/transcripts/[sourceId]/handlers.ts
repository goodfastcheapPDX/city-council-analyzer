import { NextRequest, NextResponse } from 'next/server';
import { TranscriptStorage } from '@/lib/storage/blob';
import { createLogger } from '@/lib/logging/factory';
import { getRequestCorrelation, type CorrelatedRequest } from '@/lib/logging/middleware';
import { timeOperation } from '@/lib/logging/performance';

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
            const logger = createLogger({ namespace: 'api.transcripts.get' });
            const correlation = getRequestCorrelation(request as CorrelatedRequest);
            
            try {
                const { searchParams } = new URL(request.nextUrl);
                const version = searchParams.get('version') ?
                    parseInt(searchParams.get('version')!, 10) : undefined;
                const listVersions = searchParams.get('versions') === 'true';

                logger.info('Fetching transcript', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    version,
                    listVersions,
                    endpoint: `GET /api/transcripts/${sourceId}`
                });

                if (listVersions) {
                    // Time version listing as it may be >100ms for transcripts with many versions
                    const { result: versions, timing: versionTiming } = await timeOperation(
                        () => storage.listVersions(sourceId),
                        'storage_list_versions'
                    );
                    
                    logger.info('Successfully listed transcript versions', {
                        correlationId: correlation?.correlationId,
                        sourceId,
                        versionCount: versions.length,
                        timing: versionTiming
                    });
                    
                    return NextResponse.json(versions);
                }

                // Time transcript retrieval as it may be >100ms for large transcripts
                const { result: transcript, timing: fetchTiming } = await timeOperation(
                    () => storage.getTranscript(sourceId, version),
                    'storage_get_transcript'
                );
                
                logger.info('Successfully fetched transcript', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    version: transcript.metadata.version,
                    title: transcript.metadata.title,
                    format: transcript.metadata.format,
                    timing: fetchTiming
                });
                
                return NextResponse.json(transcript);
            } catch (error) {
                logger.error('Failed to fetch transcript', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    error: error instanceof Error ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    } : String(error),
                    endpoint: `GET /api/transcripts/${sourceId}`
                });
                
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
            const logger = createLogger({ namespace: 'api.transcripts.delete' });
            const correlation = getRequestCorrelation(request as CorrelatedRequest);
            
            try {
                const { searchParams } = new URL(request.url);
                const version = searchParams.get('version') ?
                    parseInt(searchParams.get('version')!, 10) : undefined;

                logger.info('Deleting transcript', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    version,
                    deleteAllVersions: !version,
                    endpoint: `DELETE /api/transcripts/${sourceId}`
                });

                if (version) {
                    // Time single version deletion as it may be >100ms for large blobs
                    const { timing: deleteTiming } = await timeOperation(
                        () => storage.deleteTranscriptVersion(sourceId, version),
                        'storage_delete_version'
                    );
                    
                    logger.info('Successfully deleted transcript version', {
                        correlationId: correlation?.correlationId,
                        sourceId,
                        version,
                        timing: deleteTiming
                    });
                    
                    return NextResponse.json({
                        success: true,
                        message: `Transcript ${sourceId} version ${version} deleted`
                    });
                } else {
                    // Time all versions deletion as it may be >100ms for multiple versions
                    const { timing: deleteAllTiming } = await timeOperation(
                        () => storage.deleteAllVersions(sourceId),
                        'storage_delete_all_versions'
                    );
                    
                    logger.info('Successfully deleted all transcript versions', {
                        correlationId: correlation?.correlationId,
                        sourceId,
                        timing: deleteAllTiming
                    });
                    
                    return NextResponse.json({
                        success: true,
                        message: `All versions of transcript ${sourceId} deleted`
                    });
                }
            } catch (error) {
                logger.error('Failed to delete transcript', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    version: version,
                    error: error instanceof Error ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    } : String(error),
                    endpoint: `DELETE /api/transcripts/${sourceId}`
                });
                
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
            const logger = createLogger({ namespace: 'api.transcripts.update' });
            const correlation = getRequestCorrelation(request as CorrelatedRequest);
            
            try {
                const body = await request.json();
                const { version, status } = body;

                logger.info('Updating transcript processing status', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    version,
                    status,
                    endpoint: `PATCH /api/transcripts/${sourceId}`
                });

                if (!version || !status) {
                    logger.warn('Invalid update request: missing version or status', {
                        correlationId: correlation?.correlationId,
                        sourceId,
                        hasVersion: !!version,
                        hasStatus: !!status
                    });
                    
                    return NextResponse.json(
                        { error: 'Version and status are required' },
                        { status: 400 }
                    );
                }

                // Time the metadata update as it may be >100ms for database operations
                const { result: updatedMetadata, timing: updateTiming } = await timeOperation(
                    () => storage.updateProcessingStatus(sourceId, version, status),
                    'storage_update_status'
                );

                logger.info('Successfully updated transcript processing status', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    version,
                    newStatus: status,
                    updatedAt: updatedMetadata.processingCompletedAt,
                    timing: updateTiming
                });

                return NextResponse.json(updatedMetadata);
            } catch (error) {
                logger.error('Failed to update transcript', {
                    correlationId: correlation?.correlationId,
                    sourceId,
                    error: error instanceof Error ? {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    } : String(error),
                    endpoint: `PATCH /api/transcripts/${sourceId}`
                });
                
                return NextResponse.json(
                    { error: 'Failed to update transcript' },
                    { status: 500 }
                );
            }
        }
    };
}