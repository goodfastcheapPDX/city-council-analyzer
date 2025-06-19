import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TranscriptStorage, TranscriptMetadata } from '@/lib/storage/blob';
import { createStorageForTest } from '@/lib/storage/factories';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
// Test timeout for network operations
const TIMEOUT = 15000;

describe.sequential('TranscriptStorage - Deletion Functionality', () => {
    let storage: TranscriptStorage;
    let supabase: any
    let testSourceId: string;

    // Set up before each test
    beforeEach(async () => {
        // Generate a unique sourceId for each test
        testSourceId = `deletion-test-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

        storage = createStorageForTest()
        supabase = storage.supabase

        // Initialize database
        await storage.initializeDatabase();

        // Create base metadata
        const baseMetadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
            sourceId: testSourceId,
            title: "Deletion Test Transcript",
            date: "2023-06-15",
            speakers: ["Speaker A", "Speaker B"],
            format: "json",
            processingStatus: "processed",
            tags: ["test", "deletion"]
        };

        // Upload three versions of a test transcript
        await storage.uploadTranscript(
            `{"version":1,"content":"First version for deletion test"}`,
            baseMetadata
        );

        await storage.uploadTranscript(
            `{"version":2,"content":"Second version for deletion test"}`,
            baseMetadata
        );

        await storage.uploadTranscript(
            `{"version":3,"content":"Third version for deletion test"}`,
            baseMetadata
        );
    }, TIMEOUT);

    // Clean up after each test
    afterEach(async () => {
        try {
            // Delete any remaining test transcript versions
            await storage.deleteAllVersions(testSourceId);
        } catch (error) {
            // Ignore cleanup errors - the test might have already deleted everything
            return error
        }
    }, TIMEOUT);

    it('should delete a specific version of a transcript', async () => {
        // This test ensures that users can safely delete specific transcript versions
        // without affecting other versions, providing precise control over their
        // transcript history. Version-specific deletion is crucial for removing
        // outdated or incorrect versions while preserving valuable content.
        // 1. Verify we have three versions to start
        let versions = await storage.listVersions(testSourceId);
        expect(versions.length).toBe(3);

        // 2. Delete version 2
        await storage.deleteTranscriptVersion(testSourceId, 2);

        // 3. Verify only two versions remain
        versions = await storage.listVersions(testSourceId);
        expect(versions.length).toBe(2);

        // 4. Verify version 2 is gone and versions 1 and 3 remain
        const versionNumbers = versions.map(v => v.metadata.version);
        expect(versionNumbers).toContain(1);
        expect(versionNumbers).toContain(3);
        expect(versionNumbers).not.toContain(2);

        // 5. Verify we can't retrieve the deleted version
        try {
            await storage.getTranscript(testSourceId, 2);
            // If we reach here, the test fails
            expect(true).toBe(false);
        } catch (error: any) {
            // We expect an error when trying to retrieve the deleted version
            expect(error.message).toContain('not found');
        }

        // 6. Verify we can still retrieve the remaining versions
        const v1 = await storage.getTranscript(testSourceId, 1);
        const v3 = await storage.getTranscript(testSourceId, 3);

        expect(v1.content).toContain('First version');
        expect(v3.content).toContain('Third version');

        // 7. Verify deletion in Supabase database
        const { data, error } = await supabase
            .from('transcript_metadata')
            .select('*')
            .eq('source_id', testSourceId)
            .eq('version', 2);

        expect(error).toBeNull();
        expect(data).toHaveLength(0); // No record should exist
    }, TIMEOUT);

    it('should delete both blob and metadata when deleting a version', async () => {
        // This test verifies that deletion operations maintain data consistency by
        // removing both blob storage and database metadata simultaneously. Incomplete
        // deletions could lead to orphaned data, storage cost issues, and system
        // integrity problems that affect all users.
        // 1. Get the blob key for version 1 before deletion
        const { data, error } = await supabase
            .from('transcript_metadata')
            .select('blob_key')
            .eq('source_id', testSourceId)
            .eq('version', 1)
            .single();

        expect(error).toBeNull();
        expect(data).toBeTruthy();

        // 2. Delete version 1
        await storage.deleteTranscriptVersion(testSourceId, 1);

        // 3. Verify metadata is deleted from Supabase
        const { data: checkData, error: checkError } = await supabase
            .from('transcript_metadata')
            .select('*')
            .eq('source_id', testSourceId)
            .eq('version', 1);

        expect(checkError).toBeNull();
        expect(checkData).toHaveLength(0);

        // 4. Try to retrieve version 1 - should fail
        try {
            await storage.getTranscript(testSourceId, 1);
            // If we reach here, the test fails
            expect(true).toBe(false);
        } catch (error: any) {
            // We expect an error when trying to retrieve the deleted version
            expect(error.message).toContain('not found');
        }

        // Note: We can't directly verify blob deletion from Vercel Blob in this test
        // since we don't have direct access to verify if the blob exists or not.
        // The fact that getTranscript fails is a good indicator that the blob
        // is no longer accessible.
    }, TIMEOUT);

    it('should delete all versions of a transcript when requested', async () => {
        // 1. Verify we have three versions to start
        let versions = await storage.listVersions(testSourceId);
        expect(versions.length).toBe(3);

        // 2. Delete all versions
        await storage.deleteAllVersions(testSourceId);

        // 3. Verify no versions remain
        versions = await storage.listVersions(testSourceId);
        expect(versions.length).toBe(0);

        // 4. Verify no metadata exists in the database
        const { data, error } = await supabase
            .from('transcript_metadata')
            .select('*')
            .eq('source_id', testSourceId);

        expect(error).toBeNull();
        expect(data).toHaveLength(0);

        // 5. Try to retrieve any version - should fail
        try {
            await storage.getTranscript(testSourceId);
            // If we reach here, the test fails
            expect(true).toBe(false);
        } catch (error: any) {
            // We expect an error when trying to retrieve the deleted transcript
            expect(error.message).toContain('not found');
        }
    }, TIMEOUT);

    it('should handle deletion of non-existent transcripts gracefully', async () => {
        // 1. Try to delete a specific version of a non-existent transcript
        const nonExistentId = 'non-existent-transcript';

        try {
            await storage.deleteTranscriptVersion(nonExistentId, 1);
            // If we reach here, the operation didn't throw, which is fine if it's graceful
        } catch (error: any) {
            // If it does throw, the error should be appropriate
            expect(error.message).toContain('not found');
        }

        // 2. Try to delete all versions of a non-existent transcript
        try {
            await storage.deleteAllVersions(nonExistentId);
            // This should not throw an error, as deleting 0 versions is acceptable
        } catch (error) {
            // If it does throw, the test fails
            expect(true).toBe(false);
        }
    }, TIMEOUT);

    it('should maintain integrity when deleting one of many versions', async () => {
        // 1. Delete the middle version (version 2)
        await storage.deleteTranscriptVersion(testSourceId, 2);

        // 2. Try to upload a new version
        const result = await storage.uploadTranscript(
            `{"version":4,"content":"Fourth version after deletion"}`,
            {
                sourceId: testSourceId,
                title: "Deletion Test Transcript - Updated",
                date: "2023-06-15",
                speakers: ["Speaker A", "Speaker B"],
                format: "json",
                processingStatus: "processed",
                tags: ["test", "deletion"]
            }
        );

        // 3. Verify the new version is version 4 (not reusing the deleted version 2)
        expect(result.metadata.version).toBe(4);

        // 4. Verify we now have 3 versions: 1, 3, and 4
        const versions = await storage.listVersions(testSourceId);
        expect(versions.length).toBe(3);

        const versionNumbers = versions.map(v => v.metadata.version).sort();
        expect(versionNumbers).toEqual([1, 3, 4]);
    }, TIMEOUT)
});