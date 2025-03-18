/**
 * Client-side utility functions for blob storage
 */
import { TranscriptMetadata } from './blob';

/**
 * Interface for upload options
 */
export interface UploadOptions {
    /**
     * File to upload
     */
    file: File;

    /**
     * Metadata for the transcript
     */
    metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version' | 'processingStatus' | 'format'>;

    /**
     * Callback for upload progress
     */
    onProgress?: (progress: number) => void;

    /**
     * Callback for upload completion
     */
    onComplete?: (result: any) => void;

    /**
     * Callback for upload error
     */
    onError?: (error: string) => void;

    /**
     * Whether to auto-trigger processing after upload
     */
    autoProcess?: boolean;
}

/**
 * Upload a transcript file directly to blob storage
 */
export async function uploadTranscriptFile(options: UploadOptions): Promise<any> {
    const { file, metadata, onProgress, onComplete, onError, autoProcess = true } = options;

    try {
        // Determine format from file extension
        const format = getFormatFromFileName(file.name);

        // First, get a presigned upload URL
        const response = await fetch('/api/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: file.name,
                contentType: file.type || 'application/octet-stream',
                metadata: {
                    ...metadata,
                    format
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get upload URL');
        }

        const { uploadUrl, sourceId, metadata: resultMetadata } = await response.json();

        // Now upload the file to the presigned URL
        const xhr = new XMLHttpRequest();

        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        // Set up progress tracking
        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    onProgress(percentComplete);
                }
            };
        }

        // Create a promise to handle the upload
        const uploadPromise = new Promise((resolve, reject) => {
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(resultMetadata);
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = function () {
                reject(new Error('Upload failed due to network error'));
            };
        });

        // Start the upload
        xhr.send(file);

        // Wait for upload to complete
        const result = await uploadPromise;

        // Optionally trigger processing
        if (autoProcess) {
            try {
                await fetch('/api/process-transcript', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceId,
                        version: resultMetadata.version
                    })
                });
            } catch (processError) {
                console.error('Failed to trigger processing:', processError);
                // Don't fail the entire operation if processing trigger fails
            }
        }

        // Call completion callback
        if (onComplete) {
            onComplete(result);
        }

        return result;
    } catch (error) {
        console.error('Upload error:', error);

        // Call error callback
        if (onError) {
            onError(error instanceof Error ? error.message : 'Unknown upload error');
        }

        throw error;
    }
}

/**
 * Determine format from filename
 */
function getFormatFromFileName(filename: string): TranscriptMetadata['format'] {
    const extension = filename.split('.').pop()?.toLowerCase();

    switch (extension) {
        case 'json':
            return 'json';
        case 'srt':
            return 'srt';
        case 'vtt':
            return 'vtt';
        default:
            return 'text';
    }
}

/**
 * Get a formatted file size string
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
}

