// lib/storage/client.ts
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

// components/transcript/FileUploader.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { uploadTranscriptFile, formatFileSize } from '@/lib/storage/client';
import { TranscriptMetadata } from '@/lib/storage/blob';
import { Upload, File, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface FileUploaderProps {
    metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version' | 'processingStatus' | 'format'>;
    onComplete?: (result: any) => void;
    onError?: (error: string) => void;
}

export function FileUploader({ metadata, onComplete, onError }: FileUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0] || null;
        setFile(selectedFile);
        setError(null);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file to upload');
            return;
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            await uploadTranscriptFile({
                file,
                metadata,
                onProgress: setProgress,
                onComplete: (result) => {
                    setUploading(false);
                    setFile(null);

                    // Reset file input
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }

                    toast({
                        title: 'Upload Successful',
                        description: 'Your transcript has been uploaded and queued for processing',
                        variant: 'default'
                    });

                    if (onComplete) {
                        onComplete(result);
                    }
                },
                onError: (errorMessage) => {
                    setUploading(false);
                    setError(errorMessage);

                    toast({
                        title: 'Upload Failed',
                        description: errorMessage,
                        variant: 'destructive'
                    });

                    if (onError) {
                        onError(errorMessage);
                    }
                },
                autoProcess: true
            });
        } catch (err) {
            // Error handling is done in the callbacks
        }
    };

    return (
        <div className= "space-y-4" >
        <div
        className="border-2 border-dashed rounded-md p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer"
    onClick = {() => fileInputRef.current?.click()
}
      >
    <input
          type="file"
ref = { fileInputRef }
onChange = { handleFileChange }
className = "hidden"
accept = ".json,.txt,.srt,.vtt"
disabled = { uploading }
    />

    <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />

        <p className="text-sm font-medium" >
            Click to select or drop a transcript file
                </p>
                < p className = "text-xs text-gray-500 mt-1" >
                    Supports JSON, TXT, SRT, and VTT formats
                        </p>
                        </div>

{
    file && (
        <div className="bg-gray-50 p-3 rounded-md" >
            <div className="flex items-center justify-between" >
                <div className="flex items-center space-x-2" >
                    <File className="h-5 w-5 text-blue-500" />
                        <div>
                        <p className="font-medium text-sm" > { file.name } </p>
                            < p className = "text-xs text-gray-500" > { formatFileSize(file.size) } </p>
                                </div>
                                </div>

                                < Button
    size = "sm"
    onClick = { handleUpload }
    disabled = { uploading }
        >
        { uploading? 'Uploading...': 'Upload' }
        </Button>
        </div>

    {
        uploading && (
            <div className="mt-2" >
                <Progress value={ progress } className = "h-2" />
                    <p className="text-xs text-gray-500 mt-1 text-right" > { progress } % </p>
                        </div>
          )
    }
    </div>
      )
}

{
    error && (
        <div className="bg-red-50 p-3 rounded-md flex items-start space-x-2" >
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800" > { error } </p>
                    </div>
      )
}
</div>
  );
}