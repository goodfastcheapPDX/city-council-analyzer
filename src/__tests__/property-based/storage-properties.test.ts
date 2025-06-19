import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { TranscriptStorage, TranscriptMetadata } from '@/lib/storage/blob';
import { createStorageForTest } from '@/lib/storage/factories';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

describe.sequential('Storage Operations - Property-Based Tests', () => {
    let storage: TranscriptStorage;
    const testSourceIds: string[] = [];

    beforeEach(async () => {
        storage = createStorageForTest();
        await storage.initializeDatabase();
    });

    afterEach(async () => {
        // Clean up all test transcripts
        for (const sourceId of testSourceIds) {
            try {
                await storage.deleteAllVersions(sourceId);
            } catch (error) {
                console.warn(`Cleanup failed for ${sourceId}:`, error);
            }
        }
        testSourceIds.length = 0;
    });

    describe('Version Management Properties', () => {
        test('version numbers should always be positive integers and increment correctly', async () => {
            // This property test ensures that version numbers maintain mathematical
            // consistency across all upload operations, preventing version conflicts
            // and ensuring reliable transcript history tracking for users.
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                    fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 3 }),
                    async (sourceId, contentArray) => {
                        testSourceIds.push(sourceId);

                        const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
                            sourceId,
                            title: `Test Transcript ${sourceId}`,
                            date: '2024-01-15',
                            speakers: ['Speaker 1'],
                            format: 'json',
                            processingStatus: 'pending',
                            tags: ['test']
                        };

                        const uploadedVersions: number[] = [];

                        // Upload multiple versions sequentially
                        for (let i = 0; i < contentArray.length; i++) {
                            const result = await storage.uploadTranscript(contentArray[i], metadata);
                            
                            // Version should be a positive integer
                            expect(result.metadata.version).toBeGreaterThan(0);
                            expect(Number.isInteger(result.metadata.version)).toBe(true);
                            
                            // Version should increment by 1
                            expect(result.metadata.version).toBe(i + 1);
                            
                            uploadedVersions.push(result.metadata.version);
                        }

                        // Verify all versions are unique and sequential
                        const uniqueVersions = [...new Set(uploadedVersions)];
                        expect(uniqueVersions.length).toBe(uploadedVersions.length);
                        
                        // Versions should be consecutive integers starting from 1
                        uploadedVersions.sort((a, b) => a - b);
                        for (let i = 0; i < uploadedVersions.length; i++) {
                            expect(uploadedVersions[i]).toBe(i + 1);
                        }
                    }
                ),
                { numRuns: 3 }
            );
        });

        test('latest version retrieval should always return the highest version number', async () => {
            // This property test verifies that latest version retrieval is consistent
            // and reliable across any number of versions, ensuring users always get
            // the most recent transcript content without version confusion.
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                    fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 3 }),
                    async (sourceId, contentArray) => {
                        testSourceIds.push(sourceId);

                        const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
                            sourceId,
                            title: `Latest Version Test ${sourceId}`,
                            date: '2024-01-15',
                            speakers: ['Speaker 1'],
                            format: 'text',
                            processingStatus: 'pending'
                        };

                        // Upload all versions
                        const uploadResults = [];
                        for (const content of contentArray) {
                            const result = await storage.uploadTranscript(content, metadata);
                            uploadResults.push(result);
                        }

                        // Get latest version (without specifying version number)
                        const latestTranscript = await storage.getTranscript(sourceId);
                        
                        // Should return the highest version number
                        const maxVersion = Math.max(...uploadResults.map(r => r.metadata.version));
                        expect(latestTranscript.metadata.version).toBe(maxVersion);
                        
                        // Content should match the last uploaded content
                        const lastContent = contentArray[contentArray.length - 1];
                        expect(latestTranscript.content).toBe(lastContent);
                    }
                ),
                { numRuns: 3 }
            );
        });
    });

    describe('Content Integrity Properties', () => {
        test('uploaded content should always be retrievable unchanged', async () => {
            // This property test ensures that content integrity is maintained through
            // the upload-storage-retrieval cycle, preventing data corruption that
            // would compromise transcript accuracy and user trust.
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 0, maxLength: 500 }),
                    async (sourceId, content) => {
                        testSourceIds.push(sourceId);

                        const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
                            sourceId,
                            title: `Content Integrity Test`,
                            date: '2024-01-15',
                            speakers: ['Test Speaker'],
                            format: 'text',
                            processingStatus: 'pending'
                        };

                        // Upload content
                        const uploadResult = await storage.uploadTranscript(content, metadata);
                        
                        // Retrieve content
                        const retrievedTranscript = await storage.getTranscript(sourceId, uploadResult.metadata.version);
                        
                        // Content should be identical
                        expect(retrievedTranscript.content).toBe(content);
                        
                        // Metadata should be preserved
                        expect(retrievedTranscript.metadata.sourceId).toBe(sourceId);
                        expect(retrievedTranscript.metadata.version).toBe(uploadResult.metadata.version);
                    }
                ),
                { numRuns: 5 }
            );
        });

        test('metadata fields should preserve their types and values', async () => {
            // This property test verifies that metadata type consistency is maintained
            // throughout storage operations, ensuring reliable data structure for
            // search, filtering, and analysis operations.
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                    fc.string({ minLength: 1, maxLength: 200 }),
                    fc.string().filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s) || s === '2024-01-15'),
                    fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
                    fc.oneof(fc.constant('json'), fc.constant('text'), fc.constant('srt'), fc.constant('vtt')),
                    fc.oneof(fc.constant('pending'), fc.constant('processed'), fc.constant('failed')),
                    fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
                    async (sourceId, title, date, speakers, format, processingStatus, tags) => {
                        testSourceIds.push(sourceId);

                        const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
                            sourceId,
                            title,
                            date: date === '2024-01-15' ? date : '2024-01-15', // Ensure valid date for test
                            speakers,
                            format,
                            processingStatus,
                            tags
                        };

                        // Upload transcript
                        const uploadResult = await storage.uploadTranscript('test content', metadata);
                        
                        // Retrieve and verify metadata types and values
                        const retrieved = await storage.getTranscript(sourceId);
                        
                        expect(typeof retrieved.metadata.sourceId).toBe('string');
                        expect(retrieved.metadata.sourceId).toBe(sourceId);
                        
                        expect(typeof retrieved.metadata.title).toBe('string');
                        expect(retrieved.metadata.title).toBe(title);
                        
                        expect(typeof retrieved.metadata.date).toBe('string');
                        expect(retrieved.metadata.date).toBe('2024-01-15');
                        
                        expect(Array.isArray(retrieved.metadata.speakers)).toBe(true);
                        expect(retrieved.metadata.speakers).toEqual(speakers);
                        
                        expect(typeof retrieved.metadata.format).toBe('string');
                        expect(['json', 'text', 'srt', 'vtt']).toContain(retrieved.metadata.format);
                        
                        expect(typeof retrieved.metadata.processingStatus).toBe('string');
                        expect(['pending', 'processed', 'failed']).toContain(retrieved.metadata.processingStatus);
                        
                        expect(typeof retrieved.metadata.version).toBe('number');
                        expect(retrieved.metadata.version).toBeGreaterThan(0);
                        
                        if (tags) {
                            expect(Array.isArray(retrieved.metadata.tags)).toBe(true);
                            expect(retrieved.metadata.tags).toEqual(tags);
                        }
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    describe('Listing and Filtering Properties', () => {
        test('list operations should maintain consistent ordering and pagination', async () => {
            // This property test ensures that listing operations provide consistent
            // results across pagination boundaries, maintaining reliable user experience
            // for transcript browsing and management operations.
            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            sourceId: fc.uuid(),
                            title: fc.string({ minLength: 1, maxLength: 100 }),
                            content: fc.string({ minLength: 1, maxLength: 1000 })
                        }),
                        { minLength: 2, maxLength: 4 }
                    ),
                    fc.integer({ min: 1, max: 10 }),
                    async (transcriptData, pageSize) => {
                        // Upload all transcripts
                        for (const data of transcriptData) {
                            testSourceIds.push(data.sourceId);
                            
                            const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
                                sourceId: data.sourceId,
                                title: data.title,
                                date: '2024-01-15',
                                speakers: ['Test Speaker'],
                                format: 'text',
                                processingStatus: 'pending'
                            };

                            await storage.uploadTranscript(data.content, metadata);
                        }

                        // Test pagination consistency
                        const page1 = await storage.listTranscripts(pageSize, 0);
                        const page2 = await storage.listTranscripts(pageSize, pageSize);
                        
                        // Total count should be consistent
                        expect(page1.total).toBe(transcriptData.length);
                        expect(page2.total).toBe(transcriptData.length);
                        
                        // Items should not overlap between pages
                        const page1Ids = page1.items.map(item => item.metadata.sourceId);
                        const page2Ids = page2.items.map(item => item.metadata.sourceId);
                        const intersection = page1Ids.filter(id => page2Ids.includes(id));
                        expect(intersection.length).toBe(0);
                        
                        // Total items across pages should not exceed total count
                        const totalItemsRetrieved = page1.items.length + page2.items.length;
                        expect(totalItemsRetrieved).toBeLessThanOrEqual(transcriptData.length);
                    }
                ),
                { numRuns: 3 }
            );
        });

        test('version listing should maintain chronological order', async () => {
            // This property test verifies that version listings are consistently
            // ordered chronologically, ensuring users can understand transcript
            // evolution and select appropriate versions reliably.
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
                    fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 2, maxLength: 3 }),
                    async (sourceId, contentVersions) => {
                        testSourceIds.push(sourceId);

                        const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
                            sourceId,
                            title: `Version Order Test`,
                            date: '2024-01-15',
                            speakers: ['Speaker'],
                            format: 'text',
                            processingStatus: 'pending'
                        };

                        // Upload versions with small delays to ensure different timestamps
                        const uploadTimes: Date[] = [];
                        for (let i = 0; i < contentVersions.length; i++) {
                            const result = await storage.uploadTranscript(contentVersions[i], metadata);
                            uploadTimes.push(new Date(result.metadata.uploadedAt));
                            
                            // Small delay to ensure different timestamps
                            await new Promise(resolve => setTimeout(resolve, 10));
                        }

                        // List all versions
                        const versions = await storage.listVersions(sourceId);
                        
                        // Should have all versions
                        expect(versions.length).toBe(contentVersions.length);
                        
                        // Versions should be ordered (newest first based on our implementation)
                        const versionNumbers = versions.map(v => v.metadata.version);
                        const sortedVersionNumbers = [...versionNumbers].sort((a, b) => b - a);
                        expect(versionNumbers).toEqual(sortedVersionNumbers);
                        
                        // Each version should be retrievable
                        for (const version of versions) {
                            const retrieved = await storage.getTranscript(sourceId, version.metadata.version);
                            expect(retrieved.metadata.version).toBe(version.metadata.version);
                        }
                    }
                ),
                { numRuns: 3 }
            );
        });
    });

    describe('Error Handling Properties', () => {
        test('operations on non-existent transcripts should handle errors consistently', async () => {
            // This property test ensures that operations on non-existent transcripts
            // fail gracefully with consistent error behavior, maintaining system
            // stability and providing clear feedback for error handling.
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
                    fc.integer({ min: 1, max: 1000 }),
                    async (nonExistentSourceId, version) => {
                        // Ensure this sourceId doesn't exist
                        try {
                            await storage.deleteAllVersions(nonExistentSourceId);
                        } catch {
                            // Expected - ID doesn't exist
                        }

                        // Try to get non-existent transcript
                        await expect(storage.getTranscript(nonExistentSourceId, version))
                            .rejects.toThrow();
                        
                        // Try to list versions of non-existent transcript
                        const versions = await storage.listVersions(nonExistentSourceId);
                        expect(versions.length).toBe(0);
                        
                        // Try to delete non-existent transcript (should not crash)
                        await expect(storage.deleteTranscriptVersion(nonExistentSourceId, version))
                            .rejects.toThrow();
                    }
                ),
                { numRuns: 3 }
            );
        });
    });
});