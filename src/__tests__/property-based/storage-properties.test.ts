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
        // Clean up all test transcripts with timeout
        const cleanupPromises = testSourceIds.map(async (sourceId) => {
            try {
                await Promise.race([
                    storage.deleteAllVersions(sourceId),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error(`Cleanup timeout for ${sourceId}`)), 5000)
                    )
                ]);
            } catch (error) {
                console.warn(`Cleanup failed for ${sourceId}:`, error);
            }
        });
        
        await Promise.allSettled(cleanupPromises);
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
                { numRuns: 3, interruptAfterTimeLimit: 10000 }
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
                { numRuns: 3, interruptAfterTimeLimit: 10000 }
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
                    fc.string({ minLength: 1, maxLength: 500 }),
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
                { numRuns: 3, interruptAfterTimeLimit: 10000 }
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
                    fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
                    fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
                    fc.oneof(fc.constant('json'), fc.constant('text'), fc.constant('srt'), fc.constant('vtt')),
                    fc.oneof(fc.constant('pending'), fc.constant('processed'), fc.constant('failed')),
                    fc.option(fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), { nil: undefined }),
                    async (sourceId, title, date, speakers, format, processingStatus, tags) => {
                        testSourceIds.push(sourceId);

                        const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
                            sourceId,
                            title,
                            date, // Ensure valid date for test
                            speakers,
                            format,
                            processingStatus,
                            tags
                        };

                        // Upload transcript
                        await storage.uploadTranscript('test content', metadata);
                        
                        // Retrieve and verify metadata types and values
                        const retrieved = await storage.getTranscript(sourceId);
                        
                        expect(typeof retrieved.metadata.sourceId).toBe('string');
                        expect(retrieved.metadata.sourceId).toBe(sourceId);
                        
                        expect(typeof retrieved.metadata.title).toBe('string');
                        expect(retrieved.metadata.title).toBe(title);

                        expect(typeof retrieved.metadata.date).toBe('string');
                        expect(new Date(retrieved.metadata.date).toISOString()).toBe(date);
                        
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
                { numRuns: 5, interruptAfterTimeLimit: 2000 }
            );
        });
    });
});