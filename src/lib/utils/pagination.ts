/**
 * Pure utility functions for pagination calculations
 * Extracted from TranscriptStorage to enable fast property-based testing
 */

/**
 * Result of pagination bounds calculation
 */
export interface PaginationBounds {
    from: number;
    to: number;
}

/**
 * Result of pagination parameter validation
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Normalized pagination parameters with defaults applied
 */
export interface NormalizedPagination {
    limit: number;
    offset: number;
}

/**
 * Calculates Supabase-compatible pagination bounds from limit and offset
 * This preserves the logic from the recent pagination bug fix
 * 
 * For zero limit, creates an empty range where to < from
 * For positive limit, creates range [from, to] inclusive
 * 
 * @param limit Maximum number of items to return
 * @param offset Number of items to skip
 * @returns Object with from and to values for Supabase .range()
 */
export function calculatePaginationBounds(limit: number, offset: number): PaginationBounds {
    const from = offset;
    
    // For zero limit, create an empty range
    if (limit === 0) {
        return { from, to: from - 1 };
    }
    
    // For positive limit, calculate inclusive end
    const to = offset + (limit - 1);
    
    return { from, to };
}

/**
 * Validates pagination parameters for correctness
 * 
 * @param limit Optional limit parameter
 * @param offset Optional offset parameter
 * @returns Validation result with errors if any
 */
export function validatePaginationParams(
    limit?: number, 
    offset?: number
): ValidationResult {
    const errors: string[] = [];
    
    if (limit !== undefined && limit < 0) {
        errors.push('Limit must be non-negative');
    }
    
    if (offset !== undefined && offset < 0) {
        errors.push('Offset must be non-negative');
    }
    
    return {        
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Normalizes pagination parameters by applying defaults
 * Uses the corrected defaults from the pagination bug fix: limit=10, offset=0
 * 
 * @param limit Optional limit parameter
 * @param offset Optional offset parameter
 * @returns Normalized parameters with defaults applied
 */
export function normalizePaginationDefaults(
    limit?: number, 
    offset?: number
): NormalizedPagination {
    return {
        limit: limit ?? 10,  // Default limit: 10 (not 0)
        offset: offset ?? 0  // Default offset: 0 (not 10)
    };
}