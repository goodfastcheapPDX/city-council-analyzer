import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    calculatePaginationBounds,
    validatePaginationParams,
    normalizePaginationDefaults
} from '@/lib/utils/pagination';

describe('Pagination Utilities - Pure Logic Tests', () => {
    describe('calculatePaginationBounds', () => {
        it('should calculate correct bounds for basic pagination', () => {
            // This test ensures our pagination calculation produces correct Supabase range values,
            // which is critical for accurate data retrieval and preventing off-by-one errors
            // that would cause missing or duplicated results in transcript listings.
            const result = calculatePaginationBounds(10, 0);
            
            expect(result.from).toBe(0);
            expect(result.to).toBe(9); // 0 + max(10 - 1, 0) = 9
        });

        it('should handle offset correctly', () => {
            // This test verifies that pagination offsets work correctly for page navigation,
            // ensuring users can reliably browse through transcript lists without
            // missing items or seeing duplicates between pages.
            const result = calculatePaginationBounds(5, 10);
            
            expect(result.from).toBe(10);
            expect(result.to).toBe(14); // 10 + max(5 - 1, 0) = 14
        });

        it('should handle zero limit correctly', () => {
            // This test ensures that zero limits are handled safely, preventing
            // negative range calculations that would cause database query errors
            // and maintaining system stability for edge case inputs.
            const result = calculatePaginationBounds(0, 5);
            
            expect(result.from).toBe(5);
            expect(result.to).toBe(4); // 5 + max(0 - 1, 0) = 5 + 0 = 5, but to should be 4 for empty range
        });

        it('should maintain mathematical invariants with property-based testing', () => {
            // This property test ensures that pagination bounds always maintain
            // mathematical consistency across all possible input combinations,
            // preventing range calculation errors that could break transcript listing.
            fc.assert(
                fc.property(
                    fc.nat({ max: 100 }), // limit: 0-100
                    fc.nat({ max: 1000 }), // offset: 0-1000
                    (limit, offset) => {
                        const result = calculatePaginationBounds(limit, offset);
                        
                        // from should always equal offset
                        expect(result.from).toBe(offset);
                        
                        // to should never be less than from - 1 (empty range case)
                        expect(result.to).toBeGreaterThanOrEqual(result.from - 1);
                        
                        // range size should never exceed limit
                        const rangeSize = Math.max(0, result.to - result.from + 1);
                        expect(rangeSize).toBeLessThanOrEqual(limit);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('validatePaginationParams', () => {
        it('should accept valid pagination parameters', () => {
            // This test ensures that valid pagination parameters are correctly identified,
            // preventing unnecessary rejection of legitimate user requests and maintaining
            // smooth user experience during transcript browsing.
            const result = validatePaginationParams(10, 0);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should reject negative limit', () => {
            // This test ensures that negative limits are caught early, preventing
            // invalid database queries and maintaining data integrity by rejecting
            // mathematically nonsensical pagination requests.
            const result = validatePaginationParams(-5, 0);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Limit must be non-negative');
        });

        it('should reject negative offset', () => {
            // This test ensures that negative offsets are caught early, preventing
            // invalid database range queries and maintaining consistent pagination
            // behavior across all transcript listing operations.
            const result = validatePaginationParams(10, -1);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Offset must be non-negative');
        });

        it('should handle undefined parameters as valid', () => {
            // This test ensures that undefined parameters are treated as valid,
            // allowing the system to apply default values later in the pipeline
            // and supporting optional pagination parameters in API calls.
            const result = validatePaginationParams(undefined, undefined);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should validate all possible parameter combinations', () => {
            // This property test ensures that parameter validation handles all possible
            // input combinations consistently, preventing edge cases from causing
            // system instability or inconsistent error messaging.
            fc.assert(
                fc.property(
                    fc.option(fc.integer(), { nil: undefined }),
                    fc.option(fc.integer(), { nil: undefined }),
                    (limit, offset) => {
                        const result = validatePaginationParams(limit, offset);
                        
                        // Result should always have required structure
                        expect(result).toHaveProperty('isValid');
                        expect(result).toHaveProperty('errors');
                        expect(Array.isArray(result.errors)).toBe(true);
                        
                        // If either parameter is negative, should be invalid
                        if ((limit !== undefined && limit < 0) || (offset !== undefined && offset < 0)) {
                            expect(result.isValid).toBe(false);
                            expect(result.errors.length).toBeGreaterThan(0);
                        }
                        
                        // If both parameters are undefined or non-negative, should be valid
                        if ((limit === undefined || limit >= 0) && (offset === undefined || offset >= 0)) {
                            expect(result.isValid).toBe(true);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('normalizePaginationDefaults', () => {
        it('should apply correct default values', () => {
            // This test ensures that default pagination values match the system
            // expectations (limit=10, offset=0), maintaining consistency with
            // the recent bug fix and preventing regression of listing functionality.
            const result = normalizePaginationDefaults(undefined, undefined);
            
            expect(result.limit).toBe(10);
            expect(result.offset).toBe(0);
        });

        it('should preserve provided values', () => {
            // This test ensures that when users provide explicit pagination values,
            // they are preserved exactly, maintaining user control over result
            // pagination and preventing unexpected parameter modification.
            const result = normalizePaginationDefaults(25, 50);
            
            expect(result.limit).toBe(25);
            expect(result.offset).toBe(50);
        });

        it('should handle mixed undefined parameters', () => {
            // This test ensures that partial parameter specification works correctly,
            // allowing users to specify only limit or offset while getting appropriate
            // defaults for the missing parameter.
            const limitOnly = normalizePaginationDefaults(15, undefined);
            expect(limitOnly.limit).toBe(15);
            expect(limitOnly.offset).toBe(0);

            const offsetOnly = normalizePaginationDefaults(undefined, 20);
            expect(offsetOnly.limit).toBe(10);
            expect(offsetOnly.offset).toBe(20);
        });

        it('should handle all possible input combinations consistently', () => {
            // This property test ensures that default normalization handles all
            // possible input combinations predictably, preventing edge cases from
            // causing inconsistent pagination behavior across the system.
            fc.assert(
                fc.property(
                    fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
                    fc.option(fc.nat({ max: 1000 }), { nil: undefined }),
                    (limit, offset) => {
                        const result = normalizePaginationDefaults(limit, offset);
                        
                        // Result should always have valid numeric values
                        expect(typeof result.limit).toBe('number');
                        expect(typeof result.offset).toBe('number');
                        expect(result.limit).toBeGreaterThanOrEqual(0);
                        expect(result.offset).toBeGreaterThanOrEqual(0);
                        
                        // Should use provided values when available
                        if (limit !== undefined) {
                            expect(result.limit).toBe(limit);
                        } else {
                            expect(result.limit).toBe(10); // Default
                        }
                        
                        if (offset !== undefined) {
                            expect(result.offset).toBe(offset);
                        } else {
                            expect(result.offset).toBe(0); // Default
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Integration - Combined Function Behavior', () => {
        it('should work together for complete pagination workflow', () => {
            // This integration test ensures that all pagination utilities work together
            // correctly, validating the complete workflow from parameter normalization
            // through validation to bounds calculation for transcript listing.
            
            // Simulate API call with undefined parameters
            const normalized = normalizePaginationDefaults(undefined, undefined);
            const validation = validatePaginationParams(normalized.limit, normalized.offset);
            
            expect(validation.isValid).toBe(true);
            
            const bounds = calculatePaginationBounds(normalized.limit, normalized.offset);
            expect(bounds.from).toBe(0);
            expect(bounds.to).toBe(9);
        });

        it('should handle the original bug scenario correctly', () => {
            // This test specifically verifies that the extracted utilities preserve
            // the fix for the original pagination bug where backwards defaults
            // (limit=0, offset=10) caused range calculation failures.
            
            // Test the corrected default behavior
            const defaults = normalizePaginationDefaults(undefined, undefined);
            expect(defaults.limit).toBe(10); // Not 0
            expect(defaults.offset).toBe(0);  // Not 10
            
            const bounds = calculatePaginationBounds(defaults.limit, defaults.offset);
            expect(bounds.from).toBe(0);
            expect(bounds.to).toBe(9);
            
            // Verify this creates a valid, non-empty range
            const rangeSize = bounds.to - bounds.from + 1;
            expect(rangeSize).toBe(10);
        });
    });
});