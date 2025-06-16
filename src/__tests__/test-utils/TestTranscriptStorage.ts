import { TranscriptMetadata, TranscriptBlobListItem } from '@/lib/storage/blob';

/**
 * In-memory implementation of TranscriptStorage for testing
 */
export class TestTranscriptStorage {
    // In-memory storage for transcripts
    private transcripts: Map<string, Map<number, {
        content: string;
        metadata: TranscriptMetadata;
        url: string;
        blobKey: string;
        size: number;
        uploadedAt: Date;
    }>> = new Map();

    /**
     * Constructor for TestTranscriptStorage
     */
    constructor() { }

    /**
     * Uploads a transcript to in-memory storage
     */
    async uploadTranscript(
        content: string,
        metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'>
    ) {
        // Check for required fields
        if (!metadata.sourceId) {
            throw new Error('Source ID is required');
        }

        // Ensure speakers is always an array
        const speakers = metadata.speakers || [];
        if (!Array.isArray(speakers)) {
            throw new Error('Speakers must be an array');
        }

        // Get the latest version if this sourceId already exists
        const currentVersion = await this.getLatestVersion(metadata.sourceId);
        const version = Number(currentVersion) + 1;

        // Create blob key with versioning
        const blobKey = `transcripts/${metadata.sourceId}/v${version}_test`;
        const url = `https://example.com/${blobKey}`;

        // Complete the metadata
        const fullMetadata: TranscriptMetadata = {
            ...metadata,
            speakers,
            version,
            uploadedAt: new Date().toISOString(),
            processingStatus: metadata.processingStatus || 'pending'
        };

        // Store in memory
        if (!this.transcripts.has(metadata.sourceId)) {
            this.transcripts.set(metadata.sourceId, new Map());
        }

        const contentSize = new TextEncoder().encode(content).length;

        this.transcripts.get(metadata.sourceId)!.set(version, {
            content,
            metadata: fullMetadata,
            url,
            blobKey,
            size: contentSize,
            uploadedAt: new Date()
        });

        return {
            url,
            blobKey,
            metadata: fullMetadata
        };
    }

    /**
     * Retrieves a transcript from in-memory storage
     */
    async getTranscript(sourceId: string, version?: number): Promise<{ content: string; metadata: TranscriptMetadata }> {
        const sourceTranscripts = this.transcripts.get(sourceId);

        if (!sourceTranscripts || sourceTranscripts.size === 0) {
            throw new Error(`Transcript with sourceId ${sourceId}${version ? ` and version ${version}` : ''} not found`);
        }

        let transcript;

        if (version !== undefined) {
            transcript = sourceTranscripts.get(version);
            if (!transcript) {
                throw new Error(`Transcript with sourceId ${sourceId} and version ${version} not found`);
            }
        } else {
            // Get latest version
            const latestVersion = Math.max(...Array.from(sourceTranscripts.keys()));
            transcript = sourceTranscripts.get(latestVersion);
        }

        if (!transcript) {
            throw new Error(`Transcript with sourceId ${sourceId}${version ? ` and version ${version}` : ''} not found`);
        }

        return {
            content: transcript.content,
            metadata: transcript.metadata
        };
    }

    /**
     * Updates processing status for a transcript
     */
    async updateProcessingStatus(
        sourceId: string,
        version: number,
        status: TranscriptMetadata['processingStatus']
    ): Promise<TranscriptMetadata> {
        const sourceTranscripts = this.transcripts.get(sourceId);

        if (!sourceTranscripts) {
            throw new Error(`Transcript with sourceId ${sourceId} not found`);
        }

        const transcript = sourceTranscripts.get(version);

        if (!transcript) {
            throw new Error(`Transcript with sourceId ${sourceId} and version ${version} not found`);
        }

        // Update the status
        transcript.metadata.processingStatus = status;

        if (status === 'processed') {
            transcript.metadata.processingCompletedAt = new Date().toISOString();
        }

        return transcript.metadata;
    }

    /**
     * Lists all versions of a transcript
     */
    async listVersions(sourceId: string): Promise<TranscriptBlobListItem[]> {
        const sourceTranscripts = this.transcripts.get(sourceId);

        if (!sourceTranscripts || sourceTranscripts.size === 0) {
            return [];
        }

        return Array.from(sourceTranscripts.entries()).map(([version, transcript]) => ({
            url: transcript.url,
            blobKey: transcript.blobKey,
            metadata: transcript.metadata,
            uploadedAt: transcript.uploadedAt,
            size: transcript.size
        }));
    }

    /**
     * Lists all transcripts (latest version of each)
     */
    async listTranscripts(limit: number = 0, offset: number = 10): Promise<{
        items: TranscriptBlobListItem[];
        total: number;
    }> {
        const latestVersions: TranscriptBlobListItem[] = [];

        // Get the latest version of each transcript
        for (const [sourceId, versions] of this.transcripts.entries()) {
            if (versions.size === 0) continue;

            const latestVersion = Math.max(...Array.from(versions.keys()));
            const transcript = versions.get(latestVersion)!;

            latestVersions.push({
                url: transcript.url,
                blobKey: transcript.blobKey,
                metadata: transcript.metadata,
                uploadedAt: transcript.uploadedAt,
                size: transcript.size
            });
        }

        // Sort by uploadedAt (newest first)
        latestVersions.sort((a, b) =>
            b.uploadedAt.getTime() - a.uploadedAt.getTime()
        );

        // Apply pagination
        const paginatedItems = latestVersions.slice(offset, offset + limit);

        return {
            items: paginatedItems,
            total: latestVersions.length
        };
    }

    /**
     * Deletes a transcript version
     */
    async deleteTranscriptVersion(sourceId: string, version: number): Promise<void> {
        const sourceTranscripts = this.transcripts.get(sourceId);

        if (!sourceTranscripts) {
            throw new Error(`Transcript with sourceId ${sourceId} not found`);
        }

        if (!sourceTranscripts.has(version)) {
            throw new Error(`Transcript with sourceId ${sourceId} and version ${version} not found`);
        }

        sourceTranscripts.delete(version);
    }

    /**
     * Deletes all versions of a transcript
     */
    async deleteAllVersions(sourceId: string): Promise<void> {
        if (!this.transcripts.has(sourceId)) {
            return;
        }

        this.transcripts.delete(sourceId);
    }

    /**
     * Private method to get the latest version number
     */
    private async getLatestVersion(sourceId: string): Promise<number> {
        const sourceTranscripts = this.transcripts.get(sourceId);

        if (!sourceTranscripts || sourceTranscripts.size === 0) {
            return 0;
        }

        return Math.max(...Array.from(sourceTranscripts.keys()));
    }

    /**
     * Helper method to add a transcript directly for testing
     */
    addTranscript(sourceId: string, version: number, data: any): void {
        if (!this.transcripts.has(sourceId)) {
            this.transcripts.set(sourceId, new Map());
        }

        const content = data.content || JSON.stringify(data);
        const metadata: TranscriptMetadata = {
            sourceId,
            version,
            title: data.title || `Test Transcript ${sourceId}`,
            date: data.date || new Date().toISOString().split('T')[0],
            speakers: data.speakers || [],
            format: data.format || 'json',
            processingStatus: data.processingStatus || 'completed',
            uploadedAt: data.uploadedAt || new Date().toISOString(),
            processingCompletedAt: data.processingCompletedAt,
            tags: data.tags
        };

        const blobKey = `transcripts/${sourceId}/v${version}_test`;
        const url = `https://example.com/${blobKey}`;

        this.transcripts.get(sourceId)!.set(version, {
            content: typeof content === 'string' ? content : JSON.stringify(content),
            metadata,
            url,
            blobKey,
            size: typeof content === 'string' ? new TextEncoder().encode(content).length : 0,
            uploadedAt: new Date()
        });
    }

    /**
     * Helper to clear all transcripts (for test cleanup)
     */
    clearAll(): void {
        this.transcripts.clear();
    }
}