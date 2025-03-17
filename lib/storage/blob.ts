// lib/storage/blob.ts
import {
    put,
    del,
    list,
    head
} from '@vercel/blob';
import { nanoid } from 'nanoid';

type PutOptions = Parameters<typeof put>[2]
type ListOptions = Parameters<typeof list>[0]
type HeadResponse = ReturnType<typeof head>
/**
 * Interface for transcript metadata stored alongside blobs
 */
export interface TranscriptMetadata {
    sourceId: string;
    title: string;
    date: string;
    speakers: string[];
    version: number;
    format: 'json' | 'text' | 'srt' | 'vtt';
    processingStatus: 'pending' | 'processed' | 'failed';
    uploadedAt: string;
    processingCompletedAt?: string;
    tags?: string[];
}

/**
 * Interface for transcript blob upload response
 */
export interface TranscriptBlobResponse {
    url: string;
    blobKey: string;
    metadata: TranscriptMetadata;
}

/**
 * Interface for listing transcript blobs
 */
export interface TranscriptBlobListItem {
    url: string;
    blobKey: string;
    metadata: TranscriptMetadata;
    uploadedAt: Date;
    size: number;
}

/**
 * Class handling Vercel Blob storage operations for transcripts
 */
export class TranscriptBlobStorage {
    private readonly pathPrefix: string;

    /**
     * Constructor for TranscriptBlobStorage
     * @param pathPrefix Optional prefix for all blob paths
     */
    constructor(pathPrefix: string = 'transcripts') {
        this.pathPrefix = pathPrefix;
    }

    /**
     * Uploads a transcript to blob storage
     * @param content Transcript content as string
     * @param metadata Transcript metadata
     * @returns Promise with upload response
     */
    async uploadTranscript(
        content: Parameters<typeof put>[1],
        metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'>
    ): Promise<TranscriptBlobResponse> {
        // Get the latest version if this sourceId already exists
        const currentVersion = await this.getLatestVersion(metadata.sourceId);
        const version = currentVersion + 1;

        // Create blob key with versioning
        const blobKey = this.generateBlobKey(metadata.sourceId, version);

        // Complete the metadata
        const fullMetadata: TranscriptMetadata = {
            ...metadata,
            version,
            uploadedAt: new Date().toISOString(),
            processingStatus: 'pending'
        };

        // Set put options with metadata
        const options: PutOptions = {
            contentType: 'application/json',
            meta: fullMetadata
        };

        // Upload to Vercel Blob
        const { url } = await put(blobKey, content, options);

        return {
            url,
            blobKey,
            metadata: fullMetadata
        };
    }

    /**
     * Retrieves a transcript from blob storage
     * @param sourceId Source identifier for the transcript
     * @param version Optional version number (retrieves latest if not specified)
     * @returns Promise with transcript content
     */
    async getTranscript(sourceId: string, version?: number): Promise<{ content: string; metadata: TranscriptMetadata }> {
        const actualVersion = version || await this.getLatestVersion(sourceId);

        if (actualVersion <= 0) {
            throw new Error(`Transcript with sourceId ${sourceId} not found`);
        }

        const blobKey = this.generateBlobKey(sourceId, actualVersion);
        const headResponse = await head(blobKey);

        if (!headResponse) {
            throw new Error(`Transcript with sourceId ${sourceId} and version ${actualVersion} not found`);
        }

        const response = await fetch(headResponse.url);

        if (!response.ok) {
            throw new Error(`Failed to fetch transcript: ${response.statusText}`);
        }

        const content = await response.text();
        const metadata = this.extractMetadata(headResponse);

        return { content, metadata };
    }

    /**
     * Updates processing status for a transcript
     * @param sourceId Source identifier for the transcript
     * @param version Version number
     * @param status New processing status
     * @returns Promise with updated metadata
     */
    async updateProcessingStatus(
        sourceId: string,
        version: number,
        status: TranscriptMetadata['processingStatus']
    ): Promise<TranscriptMetadata> {
        const blobKey = this.generateBlobKey(sourceId, version);
        const headResponse = await head(blobKey);

        if (!headResponse) {
            throw new Error(`Transcript with sourceId ${sourceId} and version ${version} not found`);
        }

        // Extract and update metadata
        const metadata = this.extractMetadata(headResponse);
        const updatedMetadata: TranscriptMetadata = {
            ...metadata,
            processingStatus: status,
            ...(status === 'processed' && { processingCompletedAt: new Date().toISOString() })
        };

        // Get current content
        const response = await fetch(headResponse.url);
        const content = await response.text();

        // Re-upload with updated metadata
        const options: PutOptions = {
            contentType: 'application/json',
            meta: updatedMetadata
        };

        await put(blobKey, content, options);

        return updatedMetadata;
    }

    /**
     * Lists all versions of a transcript
     * @param sourceId Source identifier for the transcript
     * @returns Promise with array of transcript versions
     */
    async listVersions(sourceId: string): Promise<TranscriptBlobListItem[]> {
        const prefix = `${this.pathPrefix}/${sourceId}/`;
        const options:  = { prefix };

        const { blobs } = await list(options);

        return blobs.map(blob => ({
            url: blob.url,
            blobKey: blob.pathname,
            metadata: this.parseBlobMetadata(blob.metadata as unknown as Record<string, string>),
            uploadedAt: new Date(blob.uploadedAt),
            size: blob.size
        })).sort((a, b) => b.metadata.version - a.metadata.version);
    }

    /**
     * Lists all transcripts
     * @param limit Optional maximum number of transcripts to return
     * @param cursor Optional pagination cursor
     * @returns Promise with array of transcripts (latest version of each)
     */
    async listTranscripts(limit?: number, cursor?: string): Promise<{
        items: TranscriptBlobListItem[];
        hasMore: boolean;
        nextCursor?: string
    }> {
        const options: ListOptions = {
            prefix: `${this.pathPrefix}/`,
            limit,
            cursor
        };

        const { blobs, hasMore, cursor: nextCursor } = await list(options);

        // Group by sourceId and keep only the latest version
        const latestVersions = new Map<string, TranscriptBlobListItem>();

        for (const blob of blobs) {
            const sourceId = blob.pathname.split('/')[1];
            const metadata = this.parseBlobMetadata(blob.metadata as unknown as Record<string, string>);

            const item: TranscriptBlobListItem = {
                url: blob.url,
                blobKey: blob.pathname,
                metadata,
                uploadedAt: new Date(blob.uploadedAt),
                size: blob.size
            };

            if (!latestVersions.has(sourceId) ||
                metadata.version > latestVersions.get(sourceId)!.metadata.version) {
                latestVersions.set(sourceId, item);
            }
        }

        return {
            items: Array.from(latestVersions.values())
                .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime()),
            hasMore,
            nextCursor: hasMore ? nextCursor : undefined
        };
    }

    /**
     * Deletes a transcript version
     * @param sourceId Source identifier for the transcript
     * @param version Version number to delete
     * @returns Promise indicating deletion success
     */
    async deleteTranscriptVersion(sourceId: string, version: number): Promise<void> {
        const blobKey = this.generateBlobKey(sourceId, version);
        await del(blobKey);
    }

    /**
     * Deletes all versions of a transcript
     * @param sourceId Source identifier for the transcript
     * @returns Promise indicating deletion success
     */
    async deleteAllVersions(sourceId: string): Promise<void> {
        const versions = await this.listVersions(sourceId);

        // Delete all versions concurrently
        await Promise.all(
            versions.map(version => del(version.blobKey))
        );
    }

    /**
     * Gets the latest version number for a transcript
     * @param sourceId Source identifier for the transcript
     * @returns Promise with latest version number (0 if none exists)
     */
    private async getLatestVersion(sourceId: string): Promise<number> {
        try {
            const versions = await this.listVersions(sourceId);
            return versions.length > 0 ? versions[0].metadata.version : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Generates a blob key with versioning
     * @param sourceId Source identifier for the transcript
     * @param version Version number
     * @returns Blob key string
     */
    private generateBlobKey(sourceId: string, version: number): string {
        return `${this.pathPrefix}/${sourceId}/v${version}_${nanoid(8)}`;
    }

    /**
     * Extracts metadata from a head response
     * @param headResponse Head response from blob storage
     * @returns Transcript metadata
     */
    private extractMetadata(headResponse: HeadResponse): TranscriptMetadata {
        return this.parseBlobMetadata(headResponse.metadata as unknown as Record<string, string>);
    }

    /**
     * Parses blob metadata from Record<string, string> to TranscriptMetadata
     * @param metadata Raw metadata from blob storage
     * @returns Parsed transcript metadata
     */
    private parseBlobMetadata(metadata: Record<string, string>): TranscriptMetadata {
        return {
            sourceId: metadata.sourceId,
            title: metadata.title,
            date: metadata.date,
            speakers: JSON.parse(metadata.speakers || '[]'),
            version: parseInt(metadata.version || '1', 10),
            format: (metadata.format as TranscriptMetadata['format']) || 'json',
            processingStatus: (metadata.processingStatus as TranscriptMetadata['processingStatus']) || 'pending',
            uploadedAt: metadata.uploadedAt,
            processingCompletedAt: metadata.processingCompletedAt,
            tags: metadata.tags ? JSON.parse(metadata.tags) : undefined
        };
    }
}