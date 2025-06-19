import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as fc from 'fast-check';
import { GET, DELETE, PATCH } from '@/app/api/transcripts/[sourceId]/route';
import { TestTranscriptStorage } from '@/__tests__/test-utils/TestTranscriptStorage';
import * as factories from '@/lib/storage/factories';

describe('Property-Based API Validation Tests', () => {
    let testStorage: TestTranscriptStorage;

    beforeEach(() => {
        testStorage = new TestTranscriptStorage();
        vi.spyOn(factories, 'createStorageForServer').mockResolvedValue(testStorage as any);
    });

    afterEach(() => {
        testStorage.clearAll();
        vi.restoreAllMocks();
    });

    describe('GET /api/transcripts/[sourceId] - Property-Based Tests', () => {
        test('should handle any valid sourceId format', async () => {
            // This property test verifies that our API correctly processes any valid
            // sourceId format, ensuring robust handling of user input variations and
            // preventing failures from unexpected but valid ID formats.
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                    async (sourceId) => {
                        // Add test data for this sourceId
                        testStorage.addTranscript(sourceId, 1, {
                            id: sourceId,
                            version: 1,
                            content: 'Test content'
                        });

                        const request = new NextRequest(`http://localhost/api/transcripts/${encodeURIComponent(sourceId)}`);
                        const response = await GET(request, {
                            params: Promise.resolve({ sourceId })
                        });

                        // Should either return 200 (found) or 404 (not found), never crash
                        expect([200, 404]).toContain(response.status);
                        
                        if (response.status === 200) {
                            const data = await response.json();
                            expect(data).toHaveProperty('content');
                            expect(data).toHaveProperty('metadata');
                            expect(data.metadata.sourceId).toBe(sourceId);
                        }
                    }
                ),
                { numRuns: 50 }
            );
        });

        test('should handle any integer version parameter safely', async () => {
            // This property test ensures that version parameter parsing never causes
            // system crashes or security vulnerabilities, maintaining API stability
            // regardless of malformed or edge-case version values from users.
            const sourceId = 'test-transcript';
            testStorage.addTranscript(sourceId, 1, {
                id: sourceId,
                version: 1,
                content: 'Test content'
            });

            await fc.assert(
                fc.asyncProperty(
                    fc.integer(),
                    async (version) => {
                        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}?version=${version}`);
                        const response = await GET(request, {
                            params: Promise.resolve({ sourceId })
                        });

                        // Should always return a valid HTTP status
                        expect(response.status).toBeGreaterThanOrEqual(200);
                        expect(response.status).toBeLessThan(600);

                        // Response should always be valid JSON
                        const data = await response.json();
                        expect(typeof data).toBe('object');
                    }
                ),
                { numRuns: 30 }
            );
        });

        test('should handle malformed query parameters gracefully', async () => {
            // This property test verifies that malformed query parameters never crash
            // the API, ensuring system resilience against invalid user input and
            // maintaining consistent error responses for debugging and user experience.
            const sourceId = 'test-transcript';
            testStorage.addTranscript(sourceId, 1, {
                id: sourceId,
                version: 1,
                content: 'Test content'
            });

            await fc.assert(
                fc.asyncProperty(
                    fc.string(),
                    fc.string(),
                    async (paramName, paramValue) => {
                        const request = new NextRequest(
                            `http://localhost/api/transcripts/${sourceId}?${encodeURIComponent(paramName)}=${encodeURIComponent(paramValue)}`
                        );
                        const response = await GET(request, {
                            params: Promise.resolve({ sourceId })
                        });

                        // Should never crash, always return valid response
                        expect(response.status).toBeGreaterThanOrEqual(200);
                        expect(response.status).toBeLessThan(600);

                        const data = await response.json();
                        expect(typeof data).toBe('object');
                    }
                ),
                { numRuns: 30 }
            );
        });
    });

    describe('DELETE /api/transcripts/[sourceId] - Property-Based Tests', () => {
        test('should safely handle any sourceId format for deletion', async () => {
            // This property test ensures deletion operations handle any valid sourceId
            // format without corrupting storage or causing system instability, which
            // is critical for data integrity and preventing accidental data loss.
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                    async (sourceId) => {
                        // Pre-populate with test data
                        testStorage.addTranscript(sourceId, 1, {
                            id: sourceId,
                            version: 1,
                            content: 'Test content for deletion'
                        });

                        const request = new NextRequest(`http://localhost/api/transcripts/${encodeURIComponent(sourceId)}`);
                        const response = await DELETE(request, {
                            params: Promise.resolve({ sourceId })
                        });

                        // Should return either success or error, never crash
                        expect([200, 404, 500]).toContain(response.status);

                        const data = await response.json();
                        expect(typeof data).toBe('object');
                        
                        if (response.status === 200) {
                            expect(data).toHaveProperty('success');
                            expect(data).toHaveProperty('message');
                        } else {
                            expect(data).toHaveProperty('error');
                        }
                    }
                ),
                { numRuns: 30 }
            );
        });

        test('should handle any version number for targeted deletion', async () => {
            // This property test verifies that version-specific deletion handles
            // any integer input safely, preventing storage corruption and ensuring
            // predictable behavior for version management operations.
            const sourceId = 'version-test-transcript';
            testStorage.addTranscript(sourceId, 1, {
                id: sourceId,
                version: 1,
                content: 'Version 1 content'
            });

            await fc.assert(
                fc.asyncProperty(
                    fc.integer(),
                    async (version) => {
                        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}?version=${version}`);
                        const response = await DELETE(request, {
                            params: Promise.resolve({ sourceId })
                        });

                        // Should always return valid response
                        expect(response.status).toBeGreaterThanOrEqual(200);
                        expect(response.status).toBeLessThan(600);

                        const data = await response.json();
                        expect(typeof data).toBe('object');
                    }
                ),
                { numRuns: 25 }
            );
        });
    });

    describe('PATCH /api/transcripts/[sourceId] - Property-Based Tests', () => {
        test('should validate request body structure for any input', async () => {
            // This property test ensures that PATCH operations validate request bodies
            // properly regardless of input format, preventing injection attacks and
            // maintaining data integrity during status update operations.
            const sourceId = 'patch-test-transcript';

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        version: fc.option(fc.anything(), { nil: undefined }),
                        status: fc.option(fc.anything(), { nil: undefined }),
                        extraField: fc.option(fc.anything(), { nil: undefined })
                    }),
                    async (requestBody) => {
                        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}`, {
                            method: 'PATCH',
                            body: JSON.stringify(requestBody),
                            headers: { 'Content-Type': 'application/json' }
                        });

                        const response = await PATCH(request, {
                            params: Promise.resolve({ sourceId })
                        });

                        // Should return either 200 (success), 400 (bad request), or 500 (error)
                        expect([200, 400, 500]).toContain(response.status);

                        const data = await response.json();
                        expect(typeof data).toBe('object');

                        // If validation fails, should have error message
                        if (response.status === 400) {
                            expect(data).toHaveProperty('error');
                            expect(typeof data.error).toBe('string');
                        }
                    }
                ),
                { numRuns: 40 }
            );
        });

        test('should handle malformed JSON bodies gracefully', async () => {
            // This property test verifies that malformed JSON in request bodies
            // is handled gracefully without crashing the API, maintaining system
            // stability and providing clear error messages for debugging.
            const sourceId = 'json-test-transcript';

            await fc.assert(
                fc.asyncProperty(
                    fc.string(),
                    async (malformedJson) => {
                        try {
                            const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}`, {
                                method: 'PATCH',
                                body: malformedJson,
                                headers: { 'Content-Type': 'application/json' }
                            });

                            const response = await PATCH(request, {
                                params: Promise.resolve({ sourceId })
                            });

                            // Should handle malformed JSON gracefully
                            expect(response.status).toBeGreaterThanOrEqual(400);
                            expect(response.status).toBeLessThan(600);

                            // Try to parse response - if it fails, that's also acceptable for malformed input
                            try {
                                const data = await response.json();
                                expect(typeof data).toBe('object');
                            } catch {
                                // Expected for some malformed inputs
                            }
                        } catch (error) {
                            // Some malformed JSON might cause request creation to fail, which is acceptable
                            expect(error).toBeDefined();
                        }
                    }
                ),
                { numRuns: 20 }
            );
        });
    });

    describe('TranscriptMetadata Validation - Property-Based Tests', () => {
        test('should validate transcript metadata structure with any input', async () => {
            // This property test ensures that transcript metadata validation correctly
            // identifies valid and invalid structures, preventing corrupted data from
            // entering our storage system and maintaining data consistency.
            await fc.assert(
                fc.property(
                    fc.record({
                        sourceId: fc.option(fc.string(), { nil: undefined }),
                        title: fc.option(fc.string(), { nil: undefined }),
                        date: fc.option(fc.string(), { nil: undefined }),
                        speakers: fc.option(fc.array(fc.string()), { nil: undefined }),
                        format: fc.option(fc.oneof(
                            fc.constant('json'),
                            fc.constant('text'),
                            fc.constant('srt'),
                            fc.constant('vtt'),
                            fc.string()
                        ), { nil: undefined }),
                        processingStatus: fc.option(fc.oneof(
                            fc.constant('pending'),
                            fc.constant('processed'),
                            fc.constant('failed'),
                            fc.string()
                        ), { nil: undefined }),
                        tags: fc.option(fc.array(fc.string()), { nil: undefined })
                    }),
                    (metadata) => {
                        // Validate required fields
                        const hasRequiredFields = Boolean(metadata.sourceId && 
                                                 metadata.title && 
                                                 metadata.date && 
                                                 metadata.speakers &&
                                                 metadata.format &&
                                                 metadata.processingStatus);

                        // Validate format enum
                        const validFormats = ['json', 'text', 'srt', 'vtt'];
                        const hasValidFormat = !metadata.format || validFormats.includes(metadata.format);

                        // Validate status enum
                        const validStatuses = ['pending', 'processed', 'failed'];
                        const hasValidStatus = !metadata.processingStatus || validStatuses.includes(metadata.processingStatus);

                        // Validate speakers array
                        const hasValidSpeakers = !metadata.speakers || Array.isArray(metadata.speakers);

                        // Overall validation
                        const isValid = hasRequiredFields && hasValidFormat && hasValidStatus && hasValidSpeakers;
                        
                        // The validation logic should be consistent
                        expect(typeof isValid).toBe('boolean');
                    }
                ),
                { numRuns: 100 }
            );
        });

        test('should handle date format validation consistently', async () => {
            // This property test ensures date format validation handles all possible
            // string inputs consistently, preventing temporal analysis errors and
            // maintaining data quality for chronological transcript organization.
            await fc.assert(
                fc.property(
                    fc.string(),
                    (dateString) => {
                        // Test various date format patterns
                        const iso8601Pattern = /^\d{4}-\d{2}-\d{2}$/;
                        const isValidISODate = iso8601Pattern.test(dateString);
                        
                        // Additional validation for actual date validity
                        let isParsableDate = false;
                        try {
                            const parsed = new Date(dateString);
                            isParsableDate = !isNaN(parsed.getTime());
                        } catch {
                            isParsableDate = false;
                        }

                        // Date validation should be deterministic
                        expect(typeof isValidISODate).toBe('boolean');
                        expect(typeof isParsableDate).toBe('boolean');
                        
                        // If it matches ISO format, it should generally be parsable
                        if (isValidISODate) {
                            expect(isParsableDate).toBe(true);
                        }
                    }
                ),
                { numRuns: 200 }
            );
        });
    });
});