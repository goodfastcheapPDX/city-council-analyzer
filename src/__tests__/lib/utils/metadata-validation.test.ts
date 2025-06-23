import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    validateTranscriptMetadata,
    normalizeMetadata,
    validateRequiredFields,
    type MetadataValidationResult,
    type TranscriptMetadata,
    type RequiredFieldsResult
} from '@/lib/utils/metadata-validation';

describe('Metadata Validation Utilities - Pure Logic Tests', () => {
    describe('validateRequiredFields', () => {
        it('should accept metadata with all required fields', () => {
            // This test ensures that valid metadata with all required fields is correctly
            // identified, preventing unnecessary rejection of legitimate transcript uploads
            // and maintaining smooth user experience during content submission.
            const validMetadata = {
                sourceId: 'test-123',
                title: 'City Council Meeting',
                date: '2024-01-15',
                speakers: ['Mayor Johnson', 'Council Member Smith'],
                format: 'json' as const
            };
            
            const result = validateRequiredFields(validMetadata);
            
            expect(result.isValid).toBe(true);
            expect(result.missingFields).toEqual([]);
        });

        it('should identify missing required fields', () => {
            // This test ensures that missing required fields are caught early,
            // preventing incomplete data from entering our processing pipeline
            // and causing downstream failures or corrupted analysis results.
            const incompleteMetadata = {
                sourceId: 'test-123',
                // Missing title, date, speakers, format
            };
            
            const result = validateRequiredFields(incompleteMetadata);
            
            expect(result.isValid).toBe(false);
            expect(result.missingFields).toContain('title');
            expect(result.missingFields).toContain('date');
            expect(result.missingFields).toContain('speakers');
            expect(result.missingFields).toContain('format');
        });

        it('should handle null and undefined inputs safely', () => {
            // This test ensures that edge case inputs don't crash the validation,
            // maintaining system stability when processing malformed or missing
            // metadata from various transcript sources and upload methods.
            const nullResult = validateRequiredFields(null);
            expect(nullResult.isValid).toBe(false);
            expect(nullResult.missingFields.length).toBeGreaterThan(0);
            
            const undefinedResult = validateRequiredFields(undefined);
            expect(undefinedResult.isValid).toBe(false);
            expect(undefinedResult.missingFields.length).toBeGreaterThan(0);
        });

        it('should validate required fields for any input type', () => {
            // This property test ensures that required field validation handles all
            // possible input types without crashing, maintaining system stability
            // and consistent error reporting across different input scenarios.
            fc.assert(
                fc.property(
                    fc.anything(),
                    (input) => {
                        const result = validateRequiredFields(input);
                        
                        // Result should always have required structure
                        expect(result).toHaveProperty('isValid');
                        expect(result).toHaveProperty('missingFields');
                        expect(Array.isArray(result.missingFields)).toBe(true);
                        
                        // If input is not an object or is null, should be invalid
                        if (input === null || input === undefined || typeof input !== 'object') {
                            expect(result.isValid).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('normalizeMetadata', () => {
        it('should normalize valid metadata correctly', () => {
            // This test ensures that metadata normalization produces consistent
            // structure, which is critical for database storage and AI processing
            // pipeline compatibility across different transcript sources.
            const inputMetadata = {
                sourceId: 'test-123',
                title: 'City Council Meeting',
                date: '2024-01-15',
                speakers: ['Mayor Johnson'],
                format: 'json' as const,
                tags: ['important', 'budget']
            };
            
            const normalized = normalizeMetadata(inputMetadata);
            
            expect(normalized.sourceId).toBe('test-123');
            expect(normalized.title).toBe('City Council Meeting');
            expect(normalized.date).toBe('2024-01-15');
            expect(normalized.speakers).toEqual(['Mayor Johnson']);
            expect(normalized.format).toBe('json');
            expect(normalized.tags).toEqual(['important', 'budget']);
        });

        it('should provide default values for optional fields', () => {
            // This test ensures that missing optional fields receive appropriate
            // defaults, preventing undefined values from causing issues in the
            // processing pipeline and maintaining consistent data structure.
            const minimalMetadata = {
                sourceId: 'test-123',
                title: 'Meeting',
                date: '2024-01-15',
                speakers: ['Speaker'],
                format: 'text' as const
            };
            
            const normalized = normalizeMetadata(minimalMetadata);
            
            expect(normalized.tags).toEqual([]); // Default empty array
            expect(normalized.processingStatus).toBe('pending'); // Default status
            expect(normalized.version).toBe(1); // Default version
        });

        it('should handle empty speakers array correctly', () => {
            // This test ensures that empty speaker arrays are handled gracefully,
            // which is important for transcripts that may not have identified
            // speakers or are in processing stages before speaker detection.
            const metadataWithEmptySpeakers = {
                sourceId: 'test-123',
                title: 'Meeting',
                date: '2024-01-15',
                speakers: [],
                format: 'text' as const
            };
            
            const normalized = normalizeMetadata(metadataWithEmptySpeakers);
            
            expect(normalized.speakers).toEqual([]);
            expect(Array.isArray(normalized.speakers)).toBe(true);
        });

        it('should normalize metadata for all valid input combinations', () => {
            // This property test ensures that metadata normalization handles all
            // possible valid metadata combinations correctly, maintaining consistent
            // output structure required for database storage and processing.
            fc.assert(
                fc.property(
                    fc.record({
                        sourceId: fc.string({ minLength: 1 }),
                        title: fc.string({ minLength: 1 }),
                        date: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
                            .filter(d => !isNaN(d.getTime())) // Filter out invalid dates
                            .map(d => d.toISOString().split('T')[0]),
                        speakers: fc.array(fc.string({ minLength: 1 })),
                        format: fc.oneof(
                            fc.constant('json'),
                            fc.constant('text'),
                            fc.constant('srt'),
                            fc.constant('vtt')
                        ),
                        tags: fc.option(fc.array(fc.string()), { nil: undefined })
                    }),
                    (metadata) => {
                        const normalized = normalizeMetadata(metadata);
                        
                        // Core fields should be preserved
                        expect(normalized.sourceId).toBe(metadata.sourceId);
                        expect(normalized.title).toBe(metadata.title);
                        expect(normalized.date).toBe(metadata.date);
                        expect(normalized.speakers).toEqual(metadata.speakers);
                        expect(normalized.format).toBe(metadata.format);
                        
                        // Optional fields should have defaults if missing
                        expect(Array.isArray(normalized.tags)).toBe(true);
                        expect(normalized.processingStatus).toBe('pending');
                        expect(typeof normalized.version).toBe('number');
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('validateTranscriptMetadata', () => {
        it('should accept completely valid metadata', () => {
            // This test ensures that valid metadata passes all validation checks,
            // supporting smooth transcript upload workflow and preventing false
            // rejections that would frustrate users and block content ingestion.
            const validMetadata = {
                sourceId: 'council-meeting-2024-01-15',
                title: 'City Council Regular Meeting',
                date: '2024-01-15',
                speakers: ['Mayor Johnson', 'Council Member Smith', 'Council Member Davis'],
                format: 'json' as const,
                tags: ['budget', 'zoning', 'public-hearing']
            };
            
            const result = validateTranscriptMetadata(validMetadata);
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.normalizedMetadata).toBeDefined();
        });

        it('should reject metadata with invalid date format', () => {
            // This test ensures that malformed dates are caught during validation,
            // preventing temporal analysis errors and maintaining data quality
            // for chronological transcript organization and trend analysis.
            const invalidMetadata = {
                sourceId: 'test-123',
                title: 'Meeting',
                date: 'invalid-date-format',
                speakers: ['Speaker'],
                format: 'json' as const
            };
            
            const result = validateTranscriptMetadata(invalidMetadata);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('date'))).toBe(true);
        });

        it('should reject metadata with invalid format enum', () => {
            // This test ensures that only supported transcript formats are accepted,
            // preventing processing pipeline errors and maintaining compatibility
            // with our parsing and analysis infrastructure.
            const invalidMetadata = {
                sourceId: 'test-123',
                title: 'Meeting',
                date: '2024-01-15',
                speakers: ['Speaker'],
                format: 'invalid-format' as any
            };
            
            const result = validateTranscriptMetadata(invalidMetadata);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('format'))).toBe(true);
        });

        it('should reject metadata with non-array speakers', () => {
            // This test ensures that speakers field is always an array,
            // maintaining consistency for speaker-based analysis and preventing
            // type errors in the processing pipeline.
            const invalidMetadata = {
                sourceId: 'test-123',
                title: 'Meeting',
                date: '2024-01-15',
                speakers: 'Not an array' as any,
                format: 'json' as const
            };
            
            const result = validateTranscriptMetadata(invalidMetadata);
            
            expect(result.isValid).toBe(false);
            expect(result.errors.some(error => error.includes('speakers'))).toBe(true);
        });

        it('should handle all possible input types without crashing', () => {
            // This property test ensures that metadata validation is robust against
            // any input type, preventing system crashes and maintaining stability
            // when processing malformed or unexpected data from various sources.
            fc.assert(
                fc.property(
                    fc.anything(),
                    (input) => {
                        const result = validateTranscriptMetadata(input);
                        
                        // Result should always have valid structure
                        expect(result).toHaveProperty('isValid');
                        expect(result).toHaveProperty('errors');
                        expect(Array.isArray(result.errors)).toBe(true);
                        
                        // If valid, should have normalized metadata
                        if (result.isValid) {
                            expect(result.normalizedMetadata).toBeDefined();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should validate specific field constraints', () => {
            // This property test ensures that field-specific validation rules
            // are consistently applied, maintaining data quality standards
            // for title length, date format, and other metadata constraints.
            fc.assert(
                fc.property(
                    fc.record({
                        sourceId: fc.string(),
                        title: fc.string(),
                        date: fc.string(),
                        speakers: fc.anything(),
                        format: fc.string(),
                        tags: fc.option(fc.anything(), { nil: undefined })
                    }),
                    (metadata) => {
                        const result = validateTranscriptMetadata(metadata);
                        
                        // Empty sourceId should be invalid
                        if (!metadata.sourceId || metadata.sourceId.trim() === '') {
                            expect(result.isValid).toBe(false);
                        }
                        
                        // Empty title should be invalid
                        if (!metadata.title || metadata.title.trim() === '') {
                            expect(result.isValid).toBe(false);
                        }
                        
                        // Invalid date format should be invalid
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(metadata.date)) {
                            expect(result.isValid).toBe(false);
                        }
                        
                        // Non-array speakers should be invalid
                        if (!Array.isArray(metadata.speakers)) {
                            expect(result.isValid).toBe(false);
                        }
                        
                        // Invalid format should be invalid
                        if (!['json', 'text', 'srt', 'vtt'].includes(metadata.format)) {
                            expect(result.isValid).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Integration - Complete Metadata Validation Workflow', () => {
        it('should work together for complete validation workflow', () => {
            // This integration test ensures that all metadata utilities work together
            // correctly, validating the complete workflow from raw input through
            // validation, normalization, and final metadata preparation.
            
            const rawMetadata = {
                sourceId: 'council-2024-01-15',
                title: 'City Council Meeting',
                date: '2024-01-15',
                speakers: ['Mayor', 'Council Member 1'],
                format: 'json' as const,
                tags: ['budget']
            };
            
            // First check required fields
            const requiredCheck = validateRequiredFields(rawMetadata);
            expect(requiredCheck.isValid).toBe(true);
            
            // Then validate complete metadata
            const validation = validateTranscriptMetadata(rawMetadata);
            expect(validation.isValid).toBe(true);
            
            // If valid, normalize the metadata
            const normalized = normalizeMetadata(rawMetadata);
            expect(normalized.sourceId).toBe('council-2024-01-15');
            expect(normalized.processingStatus).toBe('pending');
            expect(normalized.version).toBe(1);
        });

        it('should handle invalid metadata gracefully in workflow', () => {
            // This integration test ensures that invalid metadata is caught
            // during validation and prevents normalization, maintaining
            // system stability and providing clear error feedback to users.
            
            const invalidMetadata = {
                sourceId: '', // Invalid empty sourceId
                title: 'Valid Title',
                date: 'invalid-date',
                speakers: 'not-array' as any,
                format: 'invalid-format' as any
            };
            
            // Required fields check should fail
            const requiredCheck = validateRequiredFields(invalidMetadata);
            expect(requiredCheck.isValid).toBe(false);
            
            // Complete validation should fail
            const validation = validateTranscriptMetadata(invalidMetadata);
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            
            // When validation fails, normalization should be skipped
            // (This represents the expected workflow in the application)
        });
    });
});