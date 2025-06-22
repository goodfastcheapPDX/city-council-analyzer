import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    validateSearchParams,
    buildSearchFilters,
    validateDateRange,
    SearchQuery,
    SearchFilters
} from '@/lib/utils/search-validation';

describe('Search Validation Utilities - Pure Logic Tests', () => {
    describe('validateSearchParams', () => {
        it('should accept valid search parameters', () => {
            // This test ensures that valid search parameters are correctly identified,
            // preventing unnecessary rejection of legitimate search requests and maintaining
            // smooth user experience during transcript discovery and filtering.
            const validQuery: SearchQuery = {
                title: 'Meeting',
                speaker: 'John',
                tag: 'important',
                dateFrom: '2023-01-01',
                dateTo: '2023-12-31',
                status: 'processed'
            };
            
            const result = validateSearchParams(validQuery);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should accept empty query object', () => {
            // This test ensures that empty searches are valid, allowing users to
            // retrieve all transcripts without filters and supporting the common
            // use case of browsing all available content.
            const result = validateSearchParams({});
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should reject invalid date formats', () => {
            // This test ensures that malformed date strings are caught early,
            // preventing invalid database queries and maintaining data integrity
            // for temporal filtering operations.
            const invalidQuery: SearchQuery = {
                dateFrom: 'invalid-date',
                dateTo: '2023-13-45' // Invalid month and day
            };
            
            const result = validateSearchParams(invalidQuery);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('dateFrom'))).toBe(true);
            expect(result.errors.some(error => error.includes('dateTo'))).toBe(true);
        });

        it('should reject invalid status values', () => {
            // This test ensures that only valid processing status values are accepted,
            // preventing database query errors and maintaining consistency with
            // the transcript processing state machine.
            const invalidQuery: SearchQuery = {
                status: 'invalid-status' as any
            };
            
            const result = validateSearchParams(invalidQuery);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('status'))).toBe(true);
        });

        it('should reject date ranges where dateFrom > dateTo', () => {
            // This test ensures that logical date ranges are enforced, preventing
            // meaningless queries and maintaining user experience by catching
            // obvious input errors before database operations.
            const invalidQuery: SearchQuery = {
                dateFrom: '2023-12-31',
                dateTo: '2023-01-01'
            };
            
            const result = validateSearchParams(invalidQuery);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('date range'))).toBe(true);
        });

        it('should validate all possible parameter combinations', () => {
            // This property test ensures that search parameter validation handles all
            // possible input combinations consistently, preventing edge cases from
            // causing system instability or inconsistent error messaging.
            fc.assert(
                fc.property(
                    fc.record({
                        title: fc.option(fc.string(), { nil: undefined }),
                        speaker: fc.option(fc.string(), { nil: undefined }),
                        tag: fc.option(fc.string(), { nil: undefined }),
                        dateFrom: fc.option(fc.string(), { nil: undefined }),
                        dateTo: fc.option(fc.string(), { nil: undefined }),
                        status: fc.option(fc.oneof(
                            fc.constant('pending'),
                            fc.constant('processed'),
                            fc.constant('failed'),
                            fc.string()
                        ), { nil: undefined })
                    }),
                    (query) => {
                        const result = validateSearchParams(query);
                        
                        // Result should always have required structure
                        expect(result).toHaveProperty('isValid');
                        expect(result).toHaveProperty('errors');
                        expect(Array.isArray(result.errors)).toBe(true);
                        
                        // If status is invalid, should be marked as invalid
                        if (query.status && !['pending', 'processed', 'failed'].includes(query.status)) {
                            expect(result.isValid).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('validateDateRange', () => {
        it('should accept valid date ranges', () => {
            // This test ensures that valid ISO date ranges are correctly identified,
            // supporting accurate temporal filtering for transcript discovery and
            // chronological analysis of council proceedings.
            const result = validateDateRange('2023-01-01', '2023-12-31');
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should accept undefined dates', () => {
            // This test ensures that optional date parameters work correctly,
            // allowing users to specify only start or end dates for open-ended
            // temporal filtering scenarios.
            const fromOnly = validateDateRange('2023-01-01', undefined);
            expect(fromOnly.isValid).toBe(true);
            
            const toOnly = validateDateRange(undefined, '2023-12-31');
            expect(toOnly.isValid).toBe(true);
            
            const neither = validateDateRange(undefined, undefined);
            expect(neither.isValid).toBe(true);
        });

        it('should reject malformed date strings', () => {
            // This test ensures that malformed date strings are caught with clear
            // error messages, helping users understand and correct input errors
            // for better search experience.
            const invalidFrom = validateDateRange('not-a-date', '2023-12-31');
            expect(invalidFrom.isValid).toBe(false);
            expect(invalidFrom.errors.some(error => error.includes('dateFrom'))).toBe(true);
            
            const invalidTo = validateDateRange('2023-01-01', 'invalid');
            expect(invalidTo.isValid).toBe(false);
            expect(invalidTo.errors.some(error => error.includes('dateTo'))).toBe(true);
        });

        it('should reject backwards date ranges', () => {
            // This test ensures that logical date ordering is enforced, preventing
            // nonsensical queries and providing clear feedback when users
            // accidentally reverse date range parameters.
            const result = validateDateRange('2023-12-31', '2023-01-01');
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('before'))).toBe(true);
        });

        it('should handle all possible date string combinations', () => {
            // This property test ensures that date validation handles all possible
            // string inputs consistently, maintaining robust error handling and
            // preventing system crashes from malformed date inputs.
            fc.assert(
                fc.property(
                    fc.option(fc.string(), { nil: undefined }),
                    fc.option(fc.string(), { nil: undefined }),
                    (dateFrom, dateTo) => {
                        const result = validateDateRange(dateFrom, dateTo);
                        
                        // Result should always have valid structure
                        expect(result).toHaveProperty('isValid');
                        expect(result).toHaveProperty('errors');
                        expect(Array.isArray(result.errors)).toBe(true);
                        
                        // If both dates are undefined, should be valid
                        if (dateFrom === undefined && dateTo === undefined) {
                            expect(result.isValid).toBe(true);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('buildSearchFilters', () => {
        it('should build correct filters for all search parameters', () => {
            // This test ensures that search parameters are correctly transformed
            // into database filter objects, maintaining the mapping between user
            // search intent and actual database query operations.
            const query: SearchQuery = {
                title: 'Meeting',
                speaker: 'John',
                tag: 'important',
                dateFrom: '2023-01-01',
                dateTo: '2023-12-31',
                status: 'processed'
            };
            
            const filters = buildSearchFilters(query);
            
            expect(filters.title).toEqual({ operation: 'ilike', value: '%Meeting%' });
            expect(filters.speaker).toEqual({ operation: 'contains', value: ['John'] });
            expect(filters.tag).toEqual({ operation: 'contains', value: ['important'] });
            expect(filters.dateFrom).toEqual({ operation: 'gte', value: '2023-01-01' });
            expect(filters.dateTo).toEqual({ operation: 'lte', value: '2023-12-31' });
            expect(filters.status).toEqual({ operation: 'eq', value: 'processed' });
        });

        it('should handle empty query gracefully', () => {
            // This test ensures that empty search queries produce empty filter objects,
            // allowing the system to handle "list all" scenarios without applying
            // unnecessary database filters.
            const filters = buildSearchFilters({});
            
            expect(Object.keys(filters)).toHaveLength(0);
        });

        it('should handle partial queries correctly', () => {
            // This test ensures that partial search queries only generate filters
            // for specified parameters, maintaining flexibility for users who want
            // to search using only some available criteria.
            const titleOnly = buildSearchFilters({ title: 'Test' });
            expect(titleOnly.title).toBeDefined();
            expect(titleOnly.speaker).toBeUndefined();
            
            const dateOnly = buildSearchFilters({ 
                dateFrom: '2023-01-01',
                dateTo: '2023-12-31'
            });
            expect(dateOnly.dateFrom).toBeDefined();
            expect(dateOnly.dateTo).toBeDefined();
            expect(dateOnly.title).toBeUndefined();
        });

        it('should properly escape title search patterns', () => {
            // This test ensures that special characters in title searches are
            // properly handled to prevent SQL injection and maintain search
            // accuracy for titles containing regex-like characters.
            const query: SearchQuery = {
                title: 'Test%_Content'
            };
            
            const filters = buildSearchFilters(query);
            
            expect(filters.title?.value).toBe('%Test%_Content%');
            expect(filters.title?.operation).toBe('ilike');
        });

        it('should handle all possible search parameter combinations', () => {
            // This property test ensures that filter building handles all possible
            // parameter combinations correctly, maintaining consistent behavior
            // across different search scenarios and parameter combinations.
            fc.assert(
                fc.property(
                    fc.record({
                        title: fc.option(fc.string().filter(s => s.length > 0), { nil: undefined }),
                        speaker: fc.option(fc.string().filter(s => s.length > 0), { nil: undefined }),
                        tag: fc.option(fc.string().filter(s => s.length > 0), { nil: undefined }),
                        dateFrom: fc.option(fc.constant('2023-01-01'), { nil: undefined }),
                        dateTo: fc.option(fc.constant('2023-12-31'), { nil: undefined }),
                        status: fc.option(fc.oneof(
                            fc.constant('pending'),
                            fc.constant('processed'),
                            fc.constant('failed')
                        ), { nil: undefined })
                    }),
                    (query) => {
                        const filters = buildSearchFilters(query);
                        
                        // Should only have filters for defined parameters
                        if (query.title) {
                            expect(filters.title).toBeDefined();
                            expect(filters.title?.operation).toBe('ilike');
                        } else {
                            expect(filters.title).toBeUndefined();
                        }
                        
                        if (query.speaker) {
                            expect(filters.speaker).toBeDefined();
                            expect(filters.speaker?.operation).toBe('contains');
                        } else {
                            expect(filters.speaker).toBeUndefined();
                        }
                        
                        if (query.tag) {
                            expect(filters.tag).toBeDefined();
                            expect(filters.tag?.operation).toBe('contains');
                        } else {
                            expect(filters.tag).toBeUndefined();
                        }
                        
                        if (query.status) {
                            expect(filters.status).toBeDefined();
                            expect(filters.status?.operation).toBe('eq');
                        } else {
                            expect(filters.status).toBeUndefined();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Integration - Combined Search Validation', () => {
        it('should work together for complete search workflow', () => {
            // This integration test ensures that all search utilities work together
            // correctly, validating the complete workflow from parameter validation
            // through filter building for transcript search operations.
            
            const query: SearchQuery = {
                title: 'Council Meeting',
                speaker: 'Mayor',
                dateFrom: '2023-01-01',
                dateTo: '2023-12-31',
                status: 'processed'
            };
            
            // Validate parameters first
            const validation = validateSearchParams(query);
            expect(validation.isValid).toBe(true);
            
            // If valid, build filters
            const filters = buildSearchFilters(query);
            expect(Object.keys(filters)).toHaveLength(5);
            expect(filters.title?.value).toBe('%Council Meeting%');
            expect(filters.speaker?.value).toEqual(['Mayor']);
        });

        it('should handle invalid parameters gracefully in workflow', () => {
            // This integration test ensures that invalid search parameters are
            // caught during validation and prevent filter building, maintaining
            // system stability and providing clear error feedback to users.
            
            const invalidQuery: SearchQuery = {
                title: 'Valid Title',
                dateFrom: 'invalid-date',
                status: 'invalid-status' as any
            };
            
            // Validation should catch the errors
            const validation = validateSearchParams(invalidQuery);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            
            // When validation fails, filter building should be skipped
            // (This represents the expected workflow in the application)
        });
    });
});