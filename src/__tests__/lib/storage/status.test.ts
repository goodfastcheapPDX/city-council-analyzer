import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TranscriptStorage } from '@/lib/storage/blob';
import { createStorageForTestSync as createStorageForTest } from "@/lib/storage/factories/test";
import { generateTranscriptData, testDates } from '@/__tests__/utils/test-data-generator';
import { dateUtils } from '@/lib/config';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });


// Test timeout for network operations
const TIMEOUT = 15000;

describe.sequential('TranscriptStorage - Status Update Functionality', () => {
    let storage: TranscriptStorage;
    let supabase: any;
    let testSourceId: string;
    let baseMetadata: any;

    // Set up before tests
    beforeAll(async () => {
        // Generate deterministic test data using test-data-generator
        const testData = generateTranscriptData({
            sourceId: 'status-test-deterministic', // Use deterministic sourceId instead of Date.now()
            title: "Status Test Transcript",
            date: testDates.deterministic(), // Use deterministic date: '2024-01-15'
            speakers: ["Speaker 1", "Speaker 2"],
            format: "json",
            processingStatus: "pending", // Start with pending status
            tags: ["test", "status"]
        });

        testSourceId = testData.metadata.sourceId;
        baseMetadata = testData.metadata;

        // Create storage instance
        storage = createStorageForTest()
        supabase = storage.supabase
        // Initialize database
        await storage.initializeDatabase();

        // Upload a test transcript
        await storage.uploadTranscript(
            `{"content":"Test transcript for status updates"}`,
            baseMetadata
        );
    }, TIMEOUT);

    // Clean up after tests
    afterAll(async () => {
        try {
            // Delete test transcript
            await storage.deleteAllVersions(testSourceId);
        } catch (error) {
            console.warn(`Cleanup failed for ${testSourceId}:`, error);
        }
    }, TIMEOUT);

    it('should update processing status successfully', async () => {
        // 1. Verify initial status is "pending"
        let transcript = await storage.getTranscript(testSourceId);
        expect(transcript.metadata.processingStatus).toBe('pending');
        expect(transcript.metadata.processingCompletedAt).toBeNull();

        // 2. Update status to "processed"
        const updatedMetadata = await storage.updateProcessingStatus(
            testSourceId,
            1,
            'processed'
        );

        // 3. Verify status was updated in the returned metadata
        expect(updatedMetadata.processingStatus).toBe('processed');
        expect(updatedMetadata.processingCompletedAt).toBeTruthy();

        // 4. Verify status was updated in storage
        transcript = await storage.getTranscript(testSourceId);
        expect(transcript.metadata.processingStatus).toBe('processed');
        expect(transcript.metadata.processingCompletedAt).toBeTruthy();

        // 5. Verify status was updated in the database
        const { data, error } = await supabase
            .from('transcript_metadata')
            .select('*')
            .eq('source_id', testSourceId)
            .eq('version', 1)
            .single();

        expect(error).toBeNull();
        expect(data?.processing_status).toBe('processed');
        expect(data?.processing_completed_at).toBeTruthy();
    }, TIMEOUT);

    it('should automatically set processingCompletedAt when status changes to processed', async () => {
        // 1. Upload another version for this test - use deterministic test data
        const v2TestData = generateTranscriptData({
            sourceId: testSourceId,
            title: "Status Test Transcript - V2",
            date: testDates.deterministic(), // Use deterministic date: '2024-01-15'
            speakers: ["Speaker 1", "Speaker 2"],
            format: "json",
            processingStatus: "pending",
            tags: ["test", "status"]
        });

        await storage.uploadTranscript(
            `{"content":"Second version for status test"}`,
            v2TestData.metadata
        );

        // 2. Get the upload time using dateUtils instead of new Date()
        const beforeUpdate = dateUtils.now();

        // 3. Update status to "processed"
        const updatedMetadata = await storage.updateProcessingStatus(
            testSourceId,
            2,
            'processed'
        );

        // 4. Verify processingCompletedAt is set to a recent timestamp
        expect(updatedMetadata.processingCompletedAt).toBeTruthy();

        if (updatedMetadata.processingCompletedAt) {
            // Use DateTime for date parsing and comparison instead of new Date()
            const completedAt = DateTime.fromISO(updatedMetadata.processingCompletedAt);
            const beforeUpdateTime = DateTime.fromISO(beforeUpdate);
            const nowTime = dateUtils.now();

            // Should be after our beforeUpdate timestamp (allow 1s buffer for time discrepancies)
            expect(completedAt.toMillis()).toBeGreaterThanOrEqual(beforeUpdateTime.toMillis() - 1000);

            // Should be within the last minute from now
            expect(completedAt.toMillis()).toBeGreaterThanOrEqual(DateTime.fromISO(nowTime).toMillis() - 60000);
        }

        // 5. Update to "failed" - should not change processingCompletedAt
        const completedAtValue = updatedMetadata.processingCompletedAt;

        const failedMetadata = await storage.updateProcessingStatus(
            testSourceId,
            2,
            'failed'
        );

        // 6. Verify status changed but completion time remains
        expect(failedMetadata.processingStatus).toBe('failed');
        expect(failedMetadata.processingCompletedAt).toBe(completedAtValue);
    }, TIMEOUT);

    it('should reject invalid status values', async () => {
        // This test indirectly verifies database constraints
        // Since TypeScript prevents passing invalid values directly,
        // we'll use a type assertion to bypass compile-time checking

        // 1. Try to set an invalid status
        try {
            await storage.updateProcessingStatus(
                testSourceId,
                1,
                'invalid-status' as any
            );

            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error: any) {
            // 2. Verify we got an appropriate error
            // With new standardized error handling, constraint violations are handled by ValidationError
            expect(
                error.message.includes('constraint violation') || 
                error.message.includes('transcript_metadata_processing_status_check')
            ).toBe(true);
        }

        // 3. Verify valid statuses still work
        const pendingUpdate = await storage.updateProcessingStatus(
            testSourceId,
            1,
            'pending'
        );
        expect(pendingUpdate.processingStatus).toBe('pending');

        const failedUpdate = await storage.updateProcessingStatus(
            testSourceId,
            1,
            'failed'
        );
        expect(failedUpdate.processingStatus).toBe('failed');
    }, TIMEOUT);

    it('should throw error when updating non-existent transcript', async () => {
        // 1. Try to update a non-existent transcript
        const nonExistentId = 'non-existent-transcript';

        try {
            await storage.updateProcessingStatus(
                nonExistentId,
                1,
                'processed'
            );

            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error: any) {
            // 2. Verify we got an appropriate error
            // With new standardized error handling, not found errors are handled by NotFoundError or Database operation failed
            expect(
                error.message.includes('not found') || 
                error.message.includes('Database operation failed') ||
                error.message.includes('multiple (or no) rows returned')
            ).toBe(true);
        }

        // 3. Try to update a non-existent version of an existing transcript
        try {
            await storage.updateProcessingStatus(
                testSourceId,
                999,
                'processed'
            );

            // If we reach here, the test should fail
            expect(true).toBe(false);
        } catch (error: any) {
            // 4. Verify we got an appropriate error
            // With new standardized error handling, not found errors are handled by NotFoundError or Database operation failed
            expect(
                error.message.includes('not found') || 
                error.message.includes('Database operation failed') ||
                error.message.includes('multiple (or no) rows returned')
            ).toBe(true);
        }
    }, TIMEOUT);

    it('should maintain other metadata when updating status', async () => {
        // 1. Get current metadata
        const before = await storage.getTranscript(testSourceId, 1);
        const initialMetadata = before.metadata;

        // 2. Update status
        await storage.updateProcessingStatus(
            testSourceId,
            1,
            'processed'
        );

        // 3. Get updated metadata
        const after = await storage.getTranscript(testSourceId, 1);
        const updatedMetadata = after.metadata;

        // 4. Verify only status and processingCompletedAt changed
        expect(updatedMetadata.sourceId).toBe(initialMetadata.sourceId);
        expect(updatedMetadata.title).toBe(initialMetadata.title);
        expect(updatedMetadata.date).toBe(initialMetadata.date);
        expect(updatedMetadata.speakers).toEqual(initialMetadata.speakers);
        expect(updatedMetadata.format).toBe(initialMetadata.format);
        expect(updatedMetadata.version).toBe(initialMetadata.version);
        expect(updatedMetadata.tags).toEqual(initialMetadata.tags);
        expect(updatedMetadata.uploadedAt).toBe(initialMetadata.uploadedAt);

        // Only these should be different
        expect(updatedMetadata.processingStatus).toBe('processed');
        expect(updatedMetadata.processingCompletedAt).toBeTruthy();
    }, TIMEOUT);
});