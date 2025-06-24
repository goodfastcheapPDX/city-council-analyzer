/**
 * Pure utility functions for transcript metadata validation and normalization
 * Extracted from TranscriptStorage and API handlers to enable fast property-based testing
 */

import { dateUtils } from '@/lib/config';

/**
 * Transcript metadata interface matching the system requirements
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
 * Result of required fields validation
 */
export interface RequiredFieldsResult {
    isValid: boolean;
    missingFields: string[];
}

/**
 * Result of complete metadata validation
 */
export interface MetadataValidationResult {
    isValid: boolean;
    errors: string[];
    normalizedMetadata?: TranscriptMetadata;
}

/**
 * Validates that all required metadata fields are present
 * 
 * @param metadata Raw metadata object to validate
 * @returns Validation result with missing fields if any
 */
export function validateRequiredFields(metadata: any): RequiredFieldsResult {
    const missingFields: string[] = [];
    
    // Handle null/undefined inputs
    if (metadata === null || metadata === undefined || typeof metadata !== 'object') {
        return {
            isValid: false,
            missingFields: ['sourceId', 'title', 'date', 'speakers', 'format']
        };
    }
    
    // Check required fields
    if (!metadata.sourceId || typeof metadata.sourceId !== 'string' || metadata.sourceId.trim() === '') {
        missingFields.push('sourceId');
    }
    
    if (!metadata.title || typeof metadata.title !== 'string' || metadata.title.trim() === '') {
        missingFields.push('title');
    }
    
    if (!metadata.date || typeof metadata.date !== 'string') {
        missingFields.push('date');
    }
    
    if (!metadata.speakers) {
        missingFields.push('speakers');
    }
    
    if (!metadata.format || typeof metadata.format !== 'string') {
        missingFields.push('format');
    }
    
    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}

/**
 * Normalizes and completes metadata with default values
 * 
 * @param metadata Partial metadata object
 * @returns Complete metadata with defaults applied
 */
export function normalizeMetadata(metadata: Partial<TranscriptMetadata>): TranscriptMetadata {
    const now = dateUtils.now();
    
    return {
        sourceId: metadata.sourceId || '',
        title: metadata.title || '',
        date: metadata.date || '',
        speakers: Array.isArray(metadata.speakers) ? metadata.speakers : [],
        version: metadata.version || 1,
        format: metadata.format || 'json',
        processingStatus: metadata.processingStatus || 'pending',
        uploadedAt: metadata.uploadedAt || now,
        processingCompletedAt: metadata.processingCompletedAt,
        tags: Array.isArray(metadata.tags) ? metadata.tags : []
    };
}

/**
 * Validates complete transcript metadata with all business rules
 * 
 * @param metadata Raw metadata object to validate
 * @returns Complete validation result with errors and normalized metadata
 */
export function validateTranscriptMetadata(metadata: any): MetadataValidationResult {
    const errors: string[] = [];
    
    // Check required fields first
    const requiredCheck = validateRequiredFields(metadata);
    if (!requiredCheck.isValid) {
        errors.push(...requiredCheck.missingFields.map(field => `Required field missing: ${field}`));
    }
    
    // If basic structure is invalid, return early
    if (metadata === null || metadata === undefined || typeof metadata !== 'object') {
        return {
            isValid: false,
            errors: errors.length > 0 ? errors : ['Invalid metadata: must be an object']
        };
    }
    
    // Validate date format using standardized date utilities
    if (metadata.date && typeof metadata.date === 'string') {
        if (!dateUtils.isValidUserInput(metadata.date)) {
            errors.push('Invalid date format: must be YYYY-MM-DD');
        }
    }
    
    // Validate speakers array
    if (metadata.speakers !== undefined) {
        if (!Array.isArray(metadata.speakers)) {
            errors.push('Invalid speakers: must be an array');
        } else {
            // Check that all speakers are strings
            const invalidSpeakers = metadata.speakers.filter((speaker: any) => typeof speaker !== 'string');
            if (invalidSpeakers.length > 0) {
                errors.push('Invalid speakers: all speakers must be strings');
            }
        }
    }
    
    // Validate format enum
    if (metadata.format && typeof metadata.format === 'string') {
        const validFormats = ['json', 'text', 'srt', 'vtt'];
        if (!validFormats.includes(metadata.format)) {
            errors.push(`Invalid format: must be one of ${validFormats.join(', ')}`);
        }
    }
    
    // Validate processing status if provided
    if (metadata.processingStatus && typeof metadata.processingStatus === 'string') {
        const validStatuses = ['pending', 'processed', 'failed'];
        if (!validStatuses.includes(metadata.processingStatus)) {
            errors.push(`Invalid processing status: must be one of ${validStatuses.join(', ')}`);
        }
    }
    
    // Validate tags if provided
    if (metadata.tags !== undefined) {
        if (!Array.isArray(metadata.tags)) {
            errors.push('Invalid tags: must be an array');
        } else {
            // Check that all tags are strings
            const invalidTags = metadata.tags.filter((tag: any) => typeof tag !== 'string');
            if (invalidTags.length > 0) {
                errors.push('Invalid tags: all tags must be strings');
            }
        }
    }
    
    // Validate version if provided
    if (metadata.version !== undefined) {
        if (typeof metadata.version !== 'number' || metadata.version < 1 || !Number.isInteger(metadata.version)) {
            errors.push('Invalid version: must be a positive integer');
        }
    }
    
    const isValid = errors.length === 0;
    
    // If valid, provide normalized metadata
    const result: MetadataValidationResult = {
        isValid,
        errors
    };
    
    if (isValid) {
        result.normalizedMetadata = normalizeMetadata(metadata);
    }
    
    return result;
}