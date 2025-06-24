/**
 * Pure utility functions for search parameter validation and filter building
 * Extracted from TranscriptStorage to enable fast property-based testing
 */

import { dateUtils } from '@/lib/config';

/**
 * Search query interface matching TranscriptStorage.searchTranscripts parameters
 */
export interface SearchQuery {
    title?: string;
    speaker?: string;
    tag?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: 'pending' | 'processed' | 'failed';
    limit?: number;
    offset?: number;
}

/**
 * Result of search parameter validation
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Result of date range validation
 */
export interface DateValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Database filter operation
 */
export interface FilterOperation {
    operation: 'eq' | 'ilike' | 'contains' | 'gte' | 'lte';
    value: string | string[];
}

/**
 * Search filters for database queries
 */
export interface SearchFilters {
    title?: FilterOperation;
    speaker?: FilterOperation;
    tag?: FilterOperation;
    dateFrom?: FilterOperation;
    dateTo?: FilterOperation;
    status?: FilterOperation;
}

/**
 * Validates search parameters for correctness and security
 * 
 * @param query Search query parameters
 * @returns Validation result with errors if any
 */
export function validateSearchParams(query: SearchQuery): ValidationResult {
    const errors: string[] = [];
    
    // Validate status enum
    if (query.status && !['pending', 'processed', 'failed'].includes(query.status)) {
        errors.push(`Invalid status value '${query.status}'. Status must be one of: pending, processed, failed`);
    }
    
    // Validate date range
    const dateValidation = validateDateRange(query.dateFrom, query.dateTo);
    if (!dateValidation.isValid) {
        errors.push(...dateValidation.errors);
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates date range parameters
 * 
 * @param dateFrom Optional start date in ISO format
 * @param dateTo Optional end date in ISO format  
 * @returns Date validation result with errors if any
 */
export function validateDateRange(
    dateFrom?: string, 
    dateTo?: string
): DateValidationResult {
    const errors: string[] = [];
    
    // Validate dateFrom format
    if (dateFrom !== undefined) {
        if (!isValidISODate(dateFrom)) {
            errors.push(`dateFrom '${dateFrom}' must be a valid ISO date (YYYY-MM-DD format). Example: 2023-01-15`);
        }
    }
    
    // Validate dateTo format
    if (dateTo !== undefined) {
        if (!isValidISODate(dateTo)) {
            errors.push(`dateTo '${dateTo}' must be a valid ISO date (YYYY-MM-DD format). Example: 2023-12-31`);
        }
    }
    
    // Validate date range logic (only if both dates are valid)
    if (dateFrom && dateTo && isValidISODate(dateFrom) && isValidISODate(dateTo)) {
        if (dateUtils.isAfter(dateFrom, dateTo)) {
            errors.push(`Invalid date range: dateFrom '${dateFrom}' must be before or equal to dateTo '${dateTo}'. Please ensure the start date comes before the end date.`);
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Builds database filter objects from search parameters
 * 
 * @param query Search query parameters
 * @returns Filter objects for database operations
 */
export function buildSearchFilters(query: SearchQuery): SearchFilters {
    const filters: SearchFilters = {};
    
    // Title filter - case insensitive partial match
    if (query.title) {
        filters.title = {
            operation: 'ilike',
            value: `%${query.title}%`
        };
    }
    
    // Speaker filter - array contains match
    if (query.speaker) {
        filters.speaker = {
            operation: 'contains',
            value: [query.speaker]
        };
    }
    
    // Tag filter - array contains match  
    if (query.tag) {
        filters.tag = {
            operation: 'contains',
            value: [query.tag]
        };
    }
    
    // Date range filters
    if (query.dateFrom) {
        filters.dateFrom = {
            operation: 'gte',
            value: query.dateFrom
        };
    }
    
    if (query.dateTo) {
        filters.dateTo = {
            operation: 'lte',
            value: query.dateTo
        };
    }
    
    // Status filter - exact match
    if (query.status) {
        filters.status = {
            operation: 'eq',
            value: query.status
        };
    }
    
    return filters;
}

/**
 * Validates if a string is a valid ISO date format (YYYY-MM-DD)
 * 
 * @param dateString String to validate
 * @returns True if valid ISO date format
 */
function isValidISODate(dateString: string): boolean {
    // Check format with regex
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDatePattern.test(dateString)) {
        return false;
    }
    
    // Check if it's a valid parseable date using dateUtils
    try {
        const normalizedDate = dateUtils.userInputToDatabase(dateString);
        // Verify that the normalized date starts with the input date (same day)
        return normalizedDate.startsWith(dateString);
    } catch {
        return false;
    }
}