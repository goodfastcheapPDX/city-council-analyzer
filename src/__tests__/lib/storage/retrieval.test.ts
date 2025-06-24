import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TranscriptStorage, TranscriptMetadata } from '@/lib/storage/blob';
import { DateTime } from 'luxon';
import { createStorageForTest } from '@/lib/storage/factories';
import { dateUtils } from '@/lib/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });



// Test timeout for network operations
const TIMEOUT = 15000;

describe.sequential('TranscriptStorage - Retrieval Functionality', () => {
    let storage: TranscriptStorage;

    // Test data
    const testSourceId = `retrieval-test-${Date.now()}`;
    const testContent = {
        v1: `{"version":1,"content":"This is version 1 of the test transcript"}`,
        v2: `{"version":2,"content":"This is version 2 with some additional content"}`,
        v3: `{"version":3,"content":"This is version 3, the latest version of this transcript"}`
    };

    // Create a base metadata object
    const baseMetadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
        sourceId: testSourceId,
        title: "Test Retrieval Transcript",
        date: "2023-04-15", // Use simple YYYY-MM-DD format as expected by validation
        speakers: ["Speaker A", "Speaker B"],
        format: "json",
        processingStatus: "processed",
        processingCompletedAt: new Date().toISOString(),
        tags: ["test", "retrieval"]
    };

    // Set up before tests
    beforeAll(async () => {
        // Create storage instance
        storage = createStorageForTest()

        // Initialize database
        await storage.initializeDatabase();

        // Upload three versions of the test transcript
        await storage.uploadTranscript(testContent.v1, baseMetadata);
        await storage.uploadTranscript(testContent.v2, baseMetadata);
        await storage.uploadTranscript(testContent.v3, baseMetadata);

        // Mark all versions as processed
        await storage.updateProcessingStatus(testSourceId, 1, 'processed');
        await storage.updateProcessingStatus(testSourceId, 2, 'processed');
        await storage.updateProcessingStatus(testSourceId, 3, 'processed');
    }, TIMEOUT);

    // Clean up after tests
    afterAll(async () => {
        try {
            // Delete all test transcript versions
            await storage.deleteAllVersions(testSourceId);
        } catch (error) {
            console.warn(`Cleanup failed for ${testSourceId}:`, error);
        }
    }, TIMEOUT);

    it('should retrieve a transcript by sourceId and get the latest version by default', async () => {
        // 1. Retrieve transcript without specifying a version
        const result = await storage.getTranscript(testSourceId);

        // 2. Verify we received the latest version (v3)
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('metadata');
        expect(result.content).toBe(testContent.v3);
        expect(result.metadata.version).toBe(3);
        expect(result.metadata.sourceId).toBe(testSourceId);

        // 3. Verify complete metadata
        const metadata = result.metadata;
        expect(metadata.title).toBe(baseMetadata.title);
        // Database responses are normalized to standardized Z format via dateUtils.toDatabase()
        // Issue #112: All dates now consistently use Z format for system-wide compatibility
        expect(metadata.date).toBe('2023-04-15T00:00:00.000Z');
        expect(metadata.speakers).toEqual(baseMetadata.speakers);
        expect(metadata.format).toBe(baseMetadata.format);
        expect(metadata.processingStatus).toBe('processed');
        expect(metadata.tags).toEqual(baseMetadata.tags);
    }, TIMEOUT);

    it('should retrieve a specific version of a transcript when version is provided', async () => {
        // 1. Retrieve each version specifically
        const v1Result = await storage.getTranscript(testSourceId, 1);
        const v2Result = await storage.getTranscript(testSourceId, 2);
        const v3Result = await storage.getTranscript(testSourceId, 3);

        // 2. Verify each version has the correct content
        expect(v1Result.content).toBe(testContent.v1);
        expect(v2Result.content).toBe(testContent.v2);
        expect(v3Result.content).toBe(testContent.v3);

        // 3. Verify each version has the correct version number in metadata
        expect(v1Result.metadata.version).toBe(1);
        expect(v2Result.metadata.version).toBe(2);
        expect(v3Result.metadata.version).toBe(3);

        // 4. Verify all other metadata fields are consistent
        [v1Result, v2Result, v3Result].forEach(result => {
            expect(result.metadata.sourceId).toBe(testSourceId);
            expect(result.metadata.title).toBe(baseMetadata.title);
            expect(result.metadata.format).toBe(baseMetadata.format);
        });
    }, TIMEOUT);

    it('should throw appropriate errors when transcript doesn\'t exist', async () => {
        // 1. Try to retrieve a non-existent transcript
        const nonExistentId = 'non-existent-transcript';

        try {
            await storage.getTranscript(nonExistentId);
            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error: any) {
            // 2. Verify we got an appropriate error
            expect(error.message).toContain('not found');
            expect(error.message).toContain(nonExistentId);
        }

        // 3. Try to retrieve a non-existent version of an existing transcript
        try {
            await storage.getTranscript(testSourceId, 999);
            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error: any) {
            // 4. Verify we got an appropriate error
            expect(error.message).toContain('not found');
            expect(error.message).toContain(testSourceId);
            expect(error.message).toContain('999');
        }
    }, TIMEOUT);
});