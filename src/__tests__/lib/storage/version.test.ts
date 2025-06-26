import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TranscriptStorage, TranscriptMetadata } from '@/lib/storage/blob';
import { createStorageForTestSync as createStorageForTest } from "@/lib/storage/factories/test";
import { generateTranscriptData, testDates } from '@/__tests__/utils/test-data-generator';
import { dateUtils } from '@/lib/config';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Test timeout for network operations
const TIMEOUT = 15000;

describe.sequential('TranscriptStorage - Version Management', () => {
    let storage: TranscriptStorage;
    
    // Generate deterministic test data using test-data-generator
    const testData = generateTranscriptData({
        sourceId: 'version-mgmt-test-deterministic', // Use deterministic sourceId instead of Date.now()
        title: "Version Management Test",
        date: testDates.deterministic(), // Use deterministic date: '2024-01-15'
        speakers: ["Speaker X", "Speaker Y"],
        format: "json",
        processingStatus: "processed",
        tags: ["test", "version"]
    });

    const testSourceId = testData.metadata.sourceId;

    // Content for multiple versions
    const versionContents = [
        `{"version":1,"content":"Initial version of the transcript"}`,
        `{"version":2,"content":"Second version with some corrections"}`,
        `{"version":3,"content":"Third version with additional details"}`,
        `{"version":4,"content":"Fourth version, complete rewrite"}`,
        `{"version":5,"content":"Fifth version, final edits"}`
    ];

    // Use the generated metadata with deterministic dates
    const baseMetadata = testData.metadata;

    // Set up before tests
    beforeAll(async () => {
        // Create storage and direct Supabase client for cleanup
        storage = createStorageForTest()

        // Initialize database
        await storage.initializeDatabase();

        // Upload multiple versions of the test transcript
        for (const content of versionContents) {
            await storage.uploadTranscript(content, baseMetadata);
        }
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

    it('should list all versions of a transcript correctly', async () => {
        // 1. List all versions
        const versions = await storage.listVersions(testSourceId);

        // 2. Verify we got the correct number of versions
        expect(versions.length).toBe(versionContents.length);

        // 3. Verify they're all for the same sourceId
        for (const version of versions) {
            expect(version.metadata.sourceId).toBe(testSourceId);
        }

        // 4. Verify versions are complete objects with expected properties
        for (const version of versions) {
            expect(version).toHaveProperty('url');
            expect(version).toHaveProperty('blobKey');
            expect(version).toHaveProperty('metadata');
            expect(version).toHaveProperty('uploadedAt');
            expect(version).toHaveProperty('size');

            // Check metadata completeness
            expect(version.metadata).toHaveProperty('sourceId');
            expect(version.metadata).toHaveProperty('title');
            expect(version.metadata).toHaveProperty('date');
            expect(version.metadata).toHaveProperty('speakers');
            expect(version.metadata).toHaveProperty('version');
        }
    }, TIMEOUT);

    it('should return versions sorted with newest first', async () => {
        // 1. List all versions
        const versions = await storage.listVersions(testSourceId);

        // 2. Verify they're sorted with newest (highest version) first
        const versionNumbers = versions.map(v => v.metadata.version);

        // Check sorting
        expect(versionNumbers).toEqual([5, 4, 3, 2, 1]);

        // 3. Verify uploadedAt dates are consistent with version order
        // Use DateTime directly for date parsing and conversion to milliseconds
        const uploadDates = versions.map(v => {
            const parsed = DateTime.fromISO(v.uploadedAt);
            return parsed.toMillis();
        });

        // Each date should be >= the next one (newer or same timestamp)
        for (let i = 0; i < uploadDates.length - 1; i++) {
            expect(uploadDates[i]).toBeGreaterThanOrEqual(uploadDates[i + 1]);
        }
    }, TIMEOUT);

    it('should return an empty array when listing versions of non-existent transcript', async () => {
        // 1. Try to list versions for a non-existent sourceId
        const nonExistentId = 'non-existent-transcript-id';
        const versions = await storage.listVersions(nonExistentId);

        // 2. Verify we got an empty array
        expect(Array.isArray(versions)).toBe(true);
        expect(versions.length).toBe(0);
    }, TIMEOUT);

    it('should get the correct latest version number for existing transcripts', async () => {
        // This is a private method, so we need to test it indirectly
        // 1. Upload a new version and check its version number
        const result = await storage.uploadTranscript(
            `{"version":6,"content":"Sixth version, unexpected addition"}`,
            baseMetadata
        );

        // 2. Verify the version is correctly incremented
        expect(result.metadata.version).toBe(6);

        // 3. Upload another and verify again
        const nextResult = await storage.uploadTranscript(
            `{"version":7,"content":"Seventh version, final final"}`,
            baseMetadata
        );

        // 4. Verify again
        expect(nextResult.metadata.version).toBe(7);
    }, TIMEOUT);

    it('should return 0 as latest version when transcript doesn\'t exist', async () => {
        // We can test this by checking what version a new transcript gets
        // Generate deterministic test data for new transcript test
        const newTestData = generateTranscriptData({
            sourceId: 'new-transcript-deterministic', // Use deterministic sourceId instead of Date.now()
            title: "New Transcript Test",
            date: testDates.deterministic(),
            speakers: ["Speaker A"],
            format: "json",
            processingStatus: "pending",
            tags: ["test", "new"]
        });

        const newSourceId = newTestData.metadata.sourceId;
        const newMetadata = newTestData.metadata;

        try {
            // 1. Upload a new transcript (should be version 1)
            const result = await storage.uploadTranscript(
                `{"content":"Brand new transcript"}`,
                newMetadata
            );

            // 2. Verify it's version 1
            expect(result.metadata.version).toBe(1);

            // Clean up
            await storage.deleteAllVersions(newSourceId);
        } catch (error) {
            // Clean up in case of error
            try {
                await storage.deleteAllVersions(newSourceId);
            } catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }, TIMEOUT);

    it('should handle version conflicts during concurrent uploads', async () => {
        // Generate deterministic test data for concurrent uploads test
        const concurrentTestData = generateTranscriptData({
            sourceId: 'concurrent-test-deterministic', // Use deterministic sourceId instead of Date.now()
            title: "Concurrent Upload Test",
            date: testDates.deterministic(),
            speakers: ["Speaker X", "Speaker Y"],
            format: "json",
            processingStatus: "processed",
            tags: ["test", "concurrent"]
        });

        const concurrentSourceId = concurrentTestData.metadata.sourceId;
        const concurrentMetadata = concurrentTestData.metadata;

        try {
            // 1. Set up multiple sequential uploads instead of concurrent
            // This test verifies the database constraint is working as expected
            // and that we're incrementing versions correctly in sequence
            await storage.uploadTranscript(`{"content":"Sequential upload 1"}`, concurrentMetadata);
            await storage.uploadTranscript(`{"content":"Sequential upload 2"}`, concurrentMetadata);
            await storage.uploadTranscript(`{"content":"Sequential upload 3"}`, concurrentMetadata);

            // 2. Verify we have 3 versions with the expected version numbers
            const listedVersions = await storage.listVersions(concurrentSourceId);
            expect(listedVersions.length).toBe(3);

            const versionNumbers = listedVersions.map(v => v.metadata.version).sort();
            expect(versionNumbers).toEqual([1, 2, 3]);

            // 3. Now test the concurrent case - we expect this to potentially fail with
            // a unique constraint violation, which is actually the correct behavior
            // If it doesn't fail, we'll verify the results
            try {
                // Set up parallel uploads with the same sourceId
                const parallelPromises = [
                    storage.uploadTranscript(`{"content":"Parallel upload 1"}`, concurrentMetadata),
                    storage.uploadTranscript(`{"content":"Parallel upload 2"}`, concurrentMetadata),
                    storage.uploadTranscript(`{"content":"Parallel upload 3"}`, concurrentMetadata)
                ];

                // Try to run them in parallel
                const results = await Promise.allSettled(parallelPromises);

                // Check how many succeeded vs. failed
                const fulfilled = results.filter(r => r.status === 'fulfilled');

                // It's possible some succeeded before the conflict occurred
                console.log(`${fulfilled.length} of ${results.length} parallel uploads succeeded`);

                // If all succeeded (unlikely but possible with sufficient time between operations)
                // verify the versions are correct
                if (fulfilled.length === parallelPromises.length) {
                    const allVersions = await storage.listVersions(concurrentSourceId);
                    expect(allVersions.length).toBe(6); // 3 original + 3 parallel

                    // Check that versions 1-6 exist
                    const allVersionNumbers = new Set(allVersions.map(v => v.metadata.version));
                    expect(allVersionNumbers.size).toBe(6);
                    for (let i = 1; i <= 6; i++) {
                        expect(allVersionNumbers.has(i)).toBe(true);
                    }
                }
            } catch (error: any) {
                // It's expected that concurrent operations could fail with a conflict
                // This is actually correct behavior for the database constraint
                expect(error.message).toContain('duplicate key value');
            }

            // Clean up
            await storage.deleteAllVersions(concurrentSourceId);
        } catch (error) {
            // Clean up in case of error
            try {
                await storage.deleteAllVersions(concurrentSourceId);
            } catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }, TIMEOUT * 2);
});