// lib/storage/blob.ts
import {
    put,
    del,
    head,
} from '@vercel/blob';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { Readable } from 'stream';

/**
 * Interface for transcript metadata
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
 * Class handling Vercel Blob storage operations for transcripts with Supabase metadata storage
 */
export class TranscriptStorage {
    private readonly pathPrefix: string;
    private readonly supabase: SupabaseClient;

    /**
     * Constructor for TranscriptStorage
     * @param supabaseUrl Supabase URL
     * @param supabaseKey Supabase API key
     * @param pathPrefix Optional prefix for all blob paths
     */
    constructor(
        supabaseUrl: string,
        supabaseKey: string,
        pathPrefix: string = 'transcripts'
    ) {
        this.pathPrefix = pathPrefix;
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    /**
     * Initialize Supabase tables required for transcript storage
     */
    async initializeDatabase(): Promise<void> {
        // This would typically be done through migrations
        // But we include the code here for completeness
        const { error } = await this.supabase.rpc('initialize_transcript_tables');

        if (error) {
            throw new Error(`Failed to initialize transcript tables: ${error.message}`);
        }
    }

    /**
     * Uploads a transcript to blob storage and stores metadata in Supabase
     * @param content Transcript content
     * @param metadata Transcript metadata
     * @returns Promise with upload response
     */
    async uploadTranscript(
        content: string | ArrayBuffer | ReadableStream<any> | Readable | Blob | FormData | File,
        metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'>
    ): Promise<TranscriptBlobResponse> {
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
        console.log(`Current version for ${metadata.sourceId}: ${currentVersion}`);

        const version = Number(currentVersion) + 1;
        console.log(`New version will be: ${version}`);

        // Create blob key with versioning
        const blobKey = this.generateBlobKey(metadata.sourceId, version);

        // Complete the metadata
        const fullMetadata: TranscriptMetadata = {
            ...metadata,
            speakers, // Use the validated speakers array
            version,
            uploadedAt: new Date().toISOString(),
            processingStatus: metadata.processingStatus || 'pending'
        };

        // Upload to Vercel Blob
        const result = await put(blobKey, content, {
            contentType: 'application/json',
            access: 'public',
            cacheControlMaxAge: 3600, // Cache for an hour
            addRandomSuffix: true
        });

        // Get the size by checking the content
        let contentSize = 0;
        if (typeof content === 'string') {
            contentSize = new TextEncoder().encode(content).length;
        } else if (content instanceof ArrayBuffer) {
            contentSize = content.byteLength;
        } else if (content instanceof Blob) {
            contentSize = content.size;
        } else if (content instanceof File) {
            contentSize = content.size;
        }
        // For ReadableStream and other types, we won't have size info initially

        // Store metadata in Supabase
        const { error } = await this.supabase
            .from('transcript_metadata')
            .insert({
                blob_key: result.pathname,
                url: result.url,
                source_id: fullMetadata.sourceId,
                title: fullMetadata.title,
                date: fullMetadata.date,
                speakers: fullMetadata.speakers,
                version: fullMetadata.version,
                format: fullMetadata.format,
                processing_status: fullMetadata.processingStatus,
                uploaded_at: fullMetadata.uploadedAt,
                processing_completed_at: fullMetadata.processingCompletedAt,
                tags: fullMetadata.tags,
                size: contentSize
            });

        if (error) {
            // If metadata storage fails, delete the blob to maintain consistency
            await del(result.pathname);
            throw new Error(`Failed to store transcript metadata: ${error.message}`);
        }

        return {
            url: result.url,
            blobKey: result.pathname,
            metadata: fullMetadata
        };
    }

    /**
     * Retrieves a transcript from blob storage
     * @param sourceId Source identifier for the transcript
     * @param version Optional version number (retrieves latest if not specified)
     * @returns Promise with transcript content and metadata
     */
    async getTranscript(sourceId: string, version?: number): Promise<{ content: string; metadata: TranscriptMetadata }> {
        // Get metadata from Supabase
        let query = this.supabase
            .from('transcript_metadata')
            .select('*')
            .eq('source_id', sourceId);

        if (version) {
            query = query.eq('version', version);
        } else {
            query = query.order('version', { ascending: false }).limit(1);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to query transcript metadata: ${error.message}`);
        }

        if (!data || data.length === 0) {
            throw new Error(`Transcript with sourceId ${sourceId}${version ? ` and version ${version}` : ''} not found`);
        }

        const metadataRecord = data[0];
        const blobKey = metadataRecord.url;

        // Get content from Vercel Blob
        const headResponse = await head(blobKey);

        if (!headResponse) {
            throw new Error(`Transcript blob not found: ${blobKey}`);
        }

        const response = await fetch(headResponse.url);

        if (!response.ok) {
            throw new Error(`Failed to fetch transcript: ${response.statusText}`);
        }

        const content = await response.text();

        // Convert Supabase record to TranscriptMetadata
        const metadata: TranscriptMetadata = {
            sourceId: metadataRecord.source_id,
            title: metadataRecord.title,
            date: metadataRecord.date,
            speakers: metadataRecord.speakers || [], // Ensure speakers is always an array
            version: metadataRecord.version,
            format: metadataRecord.format,
            processingStatus: metadataRecord.processing_status,
            uploadedAt: metadataRecord.uploaded_at,
            processingCompletedAt: metadataRecord.processing_completed_at,
            tags: metadataRecord.tags
        };

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
        const updates = {
            processing_status: status,
            ...(status === 'processed' && {
                processing_completed_at: new Date().toISOString()
            })
        };

        const { data, error } = await this.supabase
            .from('transcript_metadata')
            .update(updates)
            .eq('source_id', sourceId)
            .eq('version', version)
            .select()
            .single();

        if (error || !data) {
            throw new Error(`Failed to update transcript status: ${error?.message || 'Record not found'}`);
        }

        // Convert Supabase record to TranscriptMetadata
        return {
            sourceId: data.source_id,
            title: data.title,
            date: data.date,
            speakers: data.speakers,
            version: data.version,
            format: data.format,
            processingStatus: data.processing_status,
            uploadedAt: data.uploaded_at,
            processingCompletedAt: data.processing_completed_at,
            tags: data.tags
        };
    }

    /**
     * Lists all versions of a transcript
     * @param sourceId Source identifier for the transcript
     * @returns Promise with array of transcript versions
     */
    async listVersions(sourceId: string): Promise<TranscriptBlobListItem[]> {
        const { data, error } = await this.supabase
            .from('transcript_metadata')
            .select('*')
            .eq('source_id', sourceId)
            .order('version', { ascending: false });

        console.log(data)
        if (error) {
            throw new Error(`Failed to list transcript versions: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map(record => ({
            url: record.url,
            blobKey: record.blob_key,
            metadata: {
                sourceId: record.source_id,
                title: record.title,
                date: record.date,
                speakers: record.speakers,
                version: record.version,
                format: record.format,
                processingStatus: record.processing_status,
                uploadedAt: record.uploaded_at,
                processingCompletedAt: record.processing_completed_at,
                tags: record.tags
            },
            uploadedAt: new Date(record.uploaded_at),
            size: record.size || 0
        }));
    }

    /**
     * Lists all transcripts
     * @param limit Optional maximum number of transcripts to return
     * @param offset Optional offset for pagination
     * @returns Promise with array of transcripts (latest version of each)
     */
    async listTranscripts(limit: number = 0, offset: number = 10): Promise<{
        items: TranscriptBlobListItem[];
        total: number;
    }> {
        // The starting index from which to limit the result
        const from = offset

        /* The last index to which to limit the result, inclusive.
        If limit = 10 and offset = 0, to = 9.
        In this example, .range() will return the first through the tenth rows */
        const to = offset + (Math.max(limit - 1, 0))

        // This query gets the latest version of each transcript
        const { data, error, count } = await this.supabase
            .from('transcript_metadata_latest_view')
            .select('*', { count: 'exact' })
            .order('uploaded_at', { ascending: false })
            .range(from, to)

        if (error) {
            throw new Error(`Failed to list transcripts: ${error.message}`);
        }

        if (!data) {
            return { items: [], total: 0 };
        }

        return {
            items: data.map(record => ({
                url: record.url,
                blobKey: record.blob_key,
                metadata: {
                    sourceId: record.source_id,
                    title: record.title,
                    date: record.date,
                    speakers: record.speakers,
                    version: record.version,
                    format: record.format,
                    processingStatus: record.processing_status,
                    uploadedAt: record.uploaded_at,
                    processingCompletedAt: record.processing_completed_at,
                    tags: record.tags
                },
                uploadedAt: new Date(record.uploaded_at),
                size: record.size || 0
            })),
            total: count || 0
        };
    }

    /**
     * Searches transcripts by metadata
     * @param query Search parameters
     * @returns Promise with matching transcripts
     */
    async searchTranscripts(query: {
        title?: string;
        speaker?: string;
        tag?: string;
        dateFrom?: string;
        dateTo?: string;
        status?: TranscriptMetadata['processingStatus'];
        limit?: number;
        offset?: number;
    }): Promise<{
        items: TranscriptBlobListItem[];
        total: number;
    }> {
        let supabaseQuery = this.supabase
            .from('transcript_metadata_latest_view')
            .select('*', { count: 'exact' });

        if (query.title) {
            supabaseQuery = supabaseQuery.ilike('title', `%${query.title}%`);
        }

        if (query.speaker) {
            supabaseQuery = supabaseQuery.contains('speakers', [query.speaker]);
        }

        if (query.tag) {
            supabaseQuery = supabaseQuery.contains('tags', [query.tag]);
        }

        if (query.dateFrom) {
            supabaseQuery = supabaseQuery.gte('date', query.dateFrom);
        }

        if (query.dateTo) {
            supabaseQuery = supabaseQuery.lte('date', query.dateTo);
        }

        if (query.status) {
            supabaseQuery = supabaseQuery.eq('processing_status', query.status);
        }

        supabaseQuery = supabaseQuery
            .order('uploaded_at', { ascending: false })
            .range(query.offset || 0, (query.offset || 0) + (query.limit || 9));

        const { data, error, count } = await supabaseQuery;

        if (error) {
            throw new Error(`Failed to search transcripts: ${error.message}`);
        }

        if (!data) {
            return { items: [], total: 0 };
        }

        return {
            items: data.map(record => ({
                url: record.url,
                blobKey: record.blob_key,
                metadata: {
                    sourceId: record.source_id,
                    title: record.title,
                    date: record.date,
                    speakers: record.speakers,
                    version: record.version,
                    format: record.format,
                    processingStatus: record.processing_status,
                    uploadedAt: record.uploaded_at,
                    processingCompletedAt: record.processing_completed_at,
                    tags: record.tags
                },
                uploadedAt: new Date(record.uploaded_at),
                size: record.size || 0
            })),
            total: count || 0
        };
    }

    /**
     * Deletes a transcript version
     * @param sourceId Source identifier for the transcript
     * @param version Version number to delete
     * @returns Promise indicating deletion success
     */
    async deleteTranscriptVersion(sourceId: string, version: number): Promise<void> {
        // Get the blob key from Supabase
        const { data, error } = await this.supabase
            .from('transcript_metadata')
            .select('url')
            .eq('source_id', sourceId)
            .eq('version', version)
            .single();

        if (error || !data) {
            throw new Error(`Transcript version not found: ${error?.message || 'Record not found'}`);
        }

        const blobKey = data.url;

        // Delete from Vercel Blob
        await del(blobKey);

        // Delete from Supabase
        const { error: deleteError } = await this.supabase
            .from('transcript_metadata')
            .delete()
            .eq('source_id', sourceId)
            .eq('version', version);

        if (deleteError) {
            throw new Error(`Failed to delete transcript metadata: ${deleteError.message}`);
        }
    }

    /**
     * Deletes all versions of a transcript
     * @param sourceId Source identifier for the transcript
     * @returns Promise indicating deletion success
     */
    async deleteAllVersions(sourceId: string): Promise<void> {
        // Get all versions from Supabase
        const { data, error } = await this.supabase
            .from('transcript_metadata')
            .select('url')
            .eq('source_id', sourceId);

        if (error) {
            throw new Error(`Failed to find transcript versions: ${error.message}`);
        }

        if (!data || data.length === 0) {
            return;
        }

        // Delete all blobs concurrently
        await Promise.all(
            data.map(item => del(item.url))
        );

        // Delete all metadata records
        const { error: deleteError } = await this.supabase
            .from('transcript_metadata')
            .delete()
            .eq('source_id', sourceId);

        if (deleteError) {
            throw new Error(`Failed to delete transcript metadata: ${deleteError.message}`);
        }
    }

    /**
     * Gets the latest version number for a transcript
     * @param sourceId Source identifier for the transcript
     * @returns Promise with latest version number (0 if none exists)
     */
    private async getLatestVersion(sourceId: string): Promise<number> {
        const { data, error } = await this.supabase
            .from('transcript_metadata')
            .select('version')
            .eq('source_id', sourceId)
            .order('version', { ascending: false })
            .limit(1);

        if (error) {
            console.error(`Error retrieving latest version for ${sourceId}:`, error);
            throw new Error(`Failed to retrieve latest version: ${error.message}`);
        }

        // Add more verbose logging for debugging
        console.log(`getLatestVersion for ${sourceId} returned data:`, data);

        if (!data || data.length === 0) {
            return 0;
        }

        // Ensure we're getting a number
        const version = Number(data[0].version);
        if (isNaN(version)) {
            console.warn(`Invalid version returned from database: ${data[0].version}`);
            return 0;
        }

        return version;
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

    async beginTransaction(): Promise<void> {
        await this.supabase.rpc('begin_transaction');
    }

    async commitTransaction(): Promise<void> {
        await this.supabase.rpc('commit_transaction');
    }

    async rollbackTransaction(): Promise<void> {
        await this.supabase.rpc('rollback_transaction');
    }
}