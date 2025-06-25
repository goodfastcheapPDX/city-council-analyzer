import { type SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import { 
    calculatePaginationBounds, 
    validatePaginationParams, 
    normalizePaginationDefaults 
} from '@/lib/utils/pagination';
import {
    validateSearchParams,
    buildSearchFilters,
    type SearchQuery
} from '@/lib/utils/search-validation';
import {
    validateTranscriptMetadata,
    normalizeMetadata,
    type MetadataValidationResult
} from '@/lib/utils/metadata-validation';
import { 
    AppError,
    NotFoundError,
    ValidationError,
    ServiceUnavailableError
} from '@/lib/utils/errors';
import { dateUtils, typedDateUtils, config } from '@/lib/config';


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
    processingCompletedAt?: string | null;
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
    uploadedAt: string; // ISO string format
    size: number;
}

/**
 * Maps Supabase Storage errors to standardized AppError types
 * @param error Supabase Storage error object
 * @param context Additional context for error message
 * @returns Standardized AppError instance
 */
function handleStorageError(error: any, context: string): never {
    // Handle common Supabase Storage error patterns
    if (error?.message) {
        const errorMessage = error.message.toLowerCase();
        
        // File not found errors
        if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
            throw new NotFoundError(
                `Storage resource not found: ${context}`,
                { originalError: error.message }
            );
        }
        
        // Permission/authorization errors
        if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
            throw new ServiceUnavailableError(
                `Storage operation unauthorized: ${context}`,
                { originalError: error.message }
            );
        }
        
        // Quota/limit errors
        if (errorMessage.includes('quota') || errorMessage.includes('limit') || errorMessage.includes('too large')) {
            throw new ValidationError(
                `Storage limit exceeded: ${context}`,
                { originalError: error.message }
            );
        }
        
        // Network/service errors
        if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
            throw new ServiceUnavailableError(
                `Storage service unavailable: ${context}`,
                { originalError: error.message }
            );
        }
    }
    
    // Generic storage error for unmatched cases
    throw new AppError(
        `Storage operation failed: ${context}`,
        500,
        { originalError: error?.message || 'Unknown storage error' }
    );
}

/**
 * Maps Supabase Database errors to standardized AppError types
 * @param error Supabase Database error object
 * @param context Additional context for error message
 * @returns Standardized AppError instance
 */
function handleDatabaseError(error: any, context: string): never {
    if (error?.message) {
        const errorMessage = error.message.toLowerCase();
        
        // Record not found errors
        if (errorMessage.includes('no rows') || errorMessage.includes('not found')) {
            throw new NotFoundError(
                `Database record not found: ${context}`,
                { originalError: error.message }
            );
        }
        
        // Constraint violation errors
        if (errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorMessage.includes('constraint')) {
            throw new ValidationError(
                `Database constraint violation: ${context}`,
                { originalError: error.message }
            );
        }
        
        // Permission errors
        if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
            throw new ServiceUnavailableError(
                `Database operation unauthorized: ${context}`,
                { originalError: error.message }
            );
        }
    }
    
    // Generic database error for unmatched cases
    throw new AppError(
        `Database operation failed: ${context}`,
        500,
        { originalError: error?.message || 'Unknown database error' }
    );
}

/**
 * Class handling Vercel Blob storage operations for transcripts with Supabase metadata storage
 */
export class TranscriptStorage {
    private readonly pathPrefix: string;
    public readonly supabase: SupabaseClient;

    /**
     * Constructor for TranscriptStorage
     * @param supabaseClient Supabase client instance
     * @param pathPrefix Optional prefix for all blob paths
     */
    constructor(
        supabaseClient: SupabaseClient,
        pathPrefix: string = 'transcripts'
    ) {
        this.pathPrefix = pathPrefix;
        this.supabase = supabaseClient;
    }

    /**
     * Initialize Supabase tables required for transcript storage
     */
    async initializeDatabase(): Promise<void> {
        // This would typically be done through migrations
        // But we include the code here for completeness
        const { error } = await this.supabase.rpc('initialize_transcript_tables');

        if (error) {
            handleDatabaseError(error, 'transcript table initialization');
        }
    }

    /**
     * Uploads a transcript to blob storage and stores metadata in Supabase
     * @param content Transcript content
     * @param metadata Transcript metadata
     * @returns Promise with upload response
     */
    async uploadTranscript(
        content: string | ArrayBuffer | Blob | File,
        metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'>
    ): Promise<TranscriptBlobResponse> {
        // Validate metadata using utility functions
        const validation = validateTranscriptMetadata(metadata);
        if (!validation.isValid) {
            throw new ValidationError(
                'Invalid transcript metadata provided',
                { validationErrors: validation.errors }
            );
        }

        // Get the latest version if this sourceId already exists
        const currentVersion = await this.getLatestVersion(metadata.sourceId);
        console.log(`Current version for ${metadata.sourceId}: ${currentVersion}`);

        const version = Number(currentVersion) + 1;
        console.log(`New version will be: ${version}`);

        // Create blob key with versioning
        const blobKey = this.generateBlobKey(metadata.sourceId, version);

        // Normalize metadata with version and timestamp
        const fullMetadata = normalizeMetadata({
            ...metadata,
            version,
            uploadedAt: dateUtils.now()
        });

        // Upload to Supabase Storage
        const { data, error: uploadError } = await this.supabase.storage
            .from(config.storage.bucketName)
            .upload(blobKey, content, {
                contentType: 'application/json',
                cacheControl: '3600', // Cache for an hour
                upsert: false // Don't overwrite existing files (addRandomSuffix equivalent)
            });

        if (uploadError) {
            handleStorageError(uploadError, `upload transcript for sourceId=${metadata.sourceId}`);
        }

        // Get the public URL for the uploaded file
        const { data: urlData } = this.supabase.storage
            .from(config.storage.bucketName)
            .getPublicUrl(blobKey);

        const result = {
            pathname: blobKey,
            url: urlData.publicUrl
        };

        // Get the size by checking the content
        let contentSize = 0;
        if (typeof content === 'string') {
            contentSize = new TextEncoder().encode(content).length;
        } else if (content instanceof ArrayBuffer) {
            contentSize = content.byteLength;
        } else if (content instanceof File) {
            contentSize = content.size;
        } else if (content instanceof Blob) {
            contentSize = content.size;
        }
        // For other types, we won't have size info initially

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
            await this.supabase.storage
                .from(config.storage.bucketName)
                .remove([result.pathname]);
            handleDatabaseError(error, `store metadata for sourceId=${fullMetadata.sourceId} version=${fullMetadata.version}`);
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
            handleDatabaseError(error, `query metadata for sourceId=${sourceId}${version ? ` version=${version}` : ''}`);
        }

        if (!data || data.length === 0) {
            throw new NotFoundError(`Transcript with sourceId ${sourceId}${version ? ` and version ${version}` : ''} not found`);
        }

        const metadataRecord = data[0];
        const blobKey = metadataRecord.blob_key;

        // Get content from Supabase Storage
        const { data: fileData, error: downloadError } = await this.supabase.storage
            .from(config.storage.bucketName)
            .download(blobKey);

        if (downloadError) {
            handleStorageError(downloadError, `download transcript blob with key=${blobKey}`);
        }

        if (!fileData) {
            throw new NotFoundError(`No file data returned for blob: ${blobKey}`);
        }

        const content = await fileData.text();
      
        // Convert Supabase record to TranscriptMetadata using normalized method
        const metadata = this.normalizeRecord(metadataRecord);
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
                processing_completed_at: dateUtils.now()
            })
        };

        const { data, error } = await this.supabase
            .from('transcript_metadata')
            .update(updates)
            .eq('source_id', sourceId)
            .eq('version', version)
            .select()
            .single();

        if (error) {
            handleDatabaseError(error, `update processing status for sourceId=${sourceId} version=${version}`);
        }
        
        if (!data) {
            throw new NotFoundError(`Transcript with sourceId ${sourceId} version ${version} not found for status update`);
        }

        // Convert Supabase record to TranscriptMetadata using normalized method
        return this.normalizeRecord(data);
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
            handleDatabaseError(error, `list versions for sourceId=${sourceId}`);
        }

        if (!data || data.length === 0) {
            return [];
        }

        return data.map(record => ({
            url: record.url,
            blobKey: record.blob_key,
            metadata: this.normalizeRecord(record),
            uploadedAt: record.uploaded_at, // Already in ISO format from database
            size: record.size || 0
        }));
    }

    /**
     * Lists all transcripts
     * @param limit Optional maximum number of transcripts to return
     * @param offset Optional offset for pagination
     * @returns Promise with array of transcripts (latest version of each)
     */
    async listTranscripts(limit?: number, offset?: number): Promise<{
        items: TranscriptBlobListItem[];
        total: number;
    }> {
        // Normalize pagination parameters with proper defaults
        const normalizedParams = normalizePaginationDefaults(limit, offset);
        
        // Validate parameters
        const validation = validatePaginationParams(normalizedParams.limit, normalizedParams.offset);
        if (!validation.isValid) {
            throw new ValidationError(`Invalid pagination parameters: ${validation.errors.join(', ')}`);
        }
        
        // Calculate Supabase range bounds
        const { from, to } = calculatePaginationBounds(normalizedParams.limit, normalizedParams.offset);

        // This query gets the latest version of each transcript
        const { data, error, count } = await this.supabase
            .from('transcript_metadata_latest_view')
            .select('*', { count: 'exact' })
            .order('uploaded_at', { ascending: false })
            .range(from, to)

        if (error) {
            handleDatabaseError(error, `list transcripts with limit=${normalizedParams.limit} offset=${normalizedParams.offset}`);
        }

        if (!data) {
            return { items: [], total: 0 };
        }

        return {
            items: data.map(record => ({
                url: record.url,
                blobKey: record.blob_key,
                metadata: this.normalizeRecord(record),
                uploadedAt: record.uploaded_at, // Already in ISO format from database
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
    async searchTranscripts(query: SearchQuery): Promise<{
        items: TranscriptBlobListItem[];
        total: number;
    }> {
        // Validate search parameters
        const validation = validateSearchParams(query);
        if (!validation.isValid) {
            throw new ValidationError(`Invalid search parameters: ${validation.errors.join(', ')}`);
        }
        
        // Build filters from validated query
        const filters = buildSearchFilters(query);
        
        // Start with base query
        let supabaseQuery = this.supabase
            .from('transcript_metadata_latest_view')
            .select('*', { count: 'exact' });

        // Apply filters based on extracted utilities
        if (filters.title) {
            supabaseQuery = supabaseQuery.ilike('title', filters.title.value as string);
        }

        if (filters.speaker) {
            supabaseQuery = supabaseQuery.contains('speakers', filters.speaker.value as string[]);
        }

        if (filters.tag) {
            supabaseQuery = supabaseQuery.contains('tags', filters.tag.value as string[]);
        }

        if (filters.dateFrom) {
            supabaseQuery = supabaseQuery.gte('date', filters.dateFrom.value as string);
        }

        if (filters.dateTo) {
            supabaseQuery = supabaseQuery.lte('date', filters.dateTo.value as string);
        }

        if (filters.status) {
            supabaseQuery = supabaseQuery.eq('processing_status', filters.status.value as string);
        }

        // Apply pagination using extracted utilities
        const normalizedParams = normalizePaginationDefaults(query.limit, query.offset);
        const { from, to } = calculatePaginationBounds(normalizedParams.limit, normalizedParams.offset);
        
        supabaseQuery = supabaseQuery
            .order('uploaded_at', { ascending: false })
            .range(from, to);

        const { data, error, count } = await supabaseQuery;

        if (error) {
            handleDatabaseError(error, `search transcripts with query=${JSON.stringify(query)}`);
        }

        if (!data) {
            return { items: [], total: 0 };
        }

        return {
            items: data.map(record => ({
                url: record.url,
                blobKey: record.blob_key,
                metadata: this.normalizeRecord(record),
                uploadedAt: record.uploaded_at, // Already in ISO format from database
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
            .select('blob_key')
            .eq('source_id', sourceId)
            .eq('version', version)
            .single();

        if (error) {
            handleDatabaseError(error, `find transcript for deletion sourceId=${sourceId} version=${version}`);
        }
        
        if (!data) {
            throw new NotFoundError(`Transcript version not found: sourceId=${sourceId} version=${version}`);
        }

        const blobKey = data.blob_key;

        // Delete from Supabase Storage
        const { error: storageError } = await this.supabase.storage
            .from(config.storage.bucketName)
            .remove([blobKey]);

        if (storageError) {
            handleStorageError(storageError, `delete transcript blob with key=${blobKey}`);
        }

        // Delete from Supabase
        const { error: deleteError } = await this.supabase
            .from('transcript_metadata')
            .delete()
            .eq('source_id', sourceId)
            .eq('version', version);

        if (deleteError) {
            handleDatabaseError(deleteError, `delete transcript metadata for sourceId=${sourceId} version=${version}`);
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
            .select('blob_key')
            .eq('source_id', sourceId);

        if (error) {
            handleDatabaseError(error, `find transcript versions for deletion sourceId=${sourceId}`);
        }

        if (!data || data.length === 0) {
            return;
        }

        // Delete all blobs from Supabase Storage
        const blobKeys = data.map(item => item.blob_key);
        const { error: storageError } = await this.supabase.storage
            .from(config.storage.bucketName)
            .remove(blobKeys);

        if (storageError) {
            handleStorageError(storageError, `delete transcript blobs for sourceId=${sourceId}`);
        }

        // Delete all metadata records
        const { error: deleteError } = await this.supabase
            .from('transcript_metadata')
            .delete()
            .eq('source_id', sourceId);

        if (deleteError) {
            handleDatabaseError(deleteError, `delete all transcript metadata for sourceId=${sourceId}`);
        }
    }

    /**
     * Normalizes a database record to TranscriptMetadata format
     * @param record Raw database record
     * @returns Normalized TranscriptMetadata object
     */
    private normalizeRecord(record: any): TranscriptMetadata {
        return {
            sourceId: record.source_id,
            title: record.title,
            date: dateUtils.toDatabase(record.date),
            speakers: record.speakers || [], // Ensure speakers is always an array
            version: record.version,
            format: record.format,
            processingStatus: record.processing_status,
            uploadedAt: dateUtils.toDatabase(record.uploaded_at),
            processingCompletedAt: record.processing_completed_at ? dateUtils.toDatabase(record.processing_completed_at) : null,
            tags: record.tags
        };
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
            handleDatabaseError(error, `retrieve latest version for sourceId=${sourceId}`);
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
        // Sanitize sourceId to prevent path issues:
        // - Replace forward slashes with hyphens to avoid double slashes
        // - Replace spaces with underscores for cleaner paths
        // - Replace curly braces and other problematic characters that could cause URL issues
        // - Ensure empty strings get a fallback value to prevent double slashes
        let sanitizedSourceId = sourceId
            .replace(/\//g, '-')           // Replace forward slashes
            .replace(/\s+/g, '_')          // Replace spaces with underscores
            .replace(/[<>:"|?*{}]/g, '-')  // Replace problematic characters including curly braces
            .replace(/[^\w\-_.]/g, '-');   // Replace any remaining non-alphanumeric chars (except hyphens, underscores, dots)
            
        // Handle edge case: empty string after sanitization
        if (!sanitizedSourceId || sanitizedSourceId.trim() === '') {
            sanitizedSourceId = `fallback-${nanoid(8)}`;
        }
            
        return `${this.pathPrefix}/${sanitizedSourceId}/v${version}_${nanoid(8)}`;
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