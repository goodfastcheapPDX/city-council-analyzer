import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { TranscriptStorage, TranscriptMetadata } from '@/lib/storage/blob';
import { createStorageForTestSync as createStorageForTest } from "@/lib/storage/factories/test";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Test timeout for network operations
const TIMEOUT = 15000;

describe.sequential('TranscriptStorage - Upload Functionality', () => {
    let storage: TranscriptStorage;
    let supabase: any
    const testSourceIds: string[] = [];

    // Sample transcript content
    const sampleTranscript = JSON.stringify({
        metadata: {
            title: "Test Meeting",
            date: "2023-03-15",
            participants: ["John Doe", "Jane Smith"]
        },
        transcript: [
            {
                speaker: "John Doe",
                timestamp: "00:00:05",
                text: "Hello everyone, thanks for joining today's meeting."
            },
            {
                speaker: "Jane Smith",
                timestamp: "00:00:10",
                text: "Thanks John, I'm excited to discuss our new project."
            }
        ]
    });

    // Sample metadata for upload
    const sampleMetadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
        sourceId: `test-transcript-${Date.now()}`,
        title: "Test Meeting Transcript",
        date: "2023-03-15",
        speakers: ["John Doe", "Jane Smith"],
        format: "json",
        processingStatus: "pending",
        tags: ["test", "meeting"]
    };

    beforeAll(async () => {
        // Create storage and direct Supabase client for cleanup
        storage = createStorageForTest()
        supabase = storage.supabase

        // Track created sourceIds for cleanup
        testSourceIds.push(sampleMetadata.sourceId);

        return await storage.initializeDatabase();
    });

    afterAll(async () => {
        // Clean up all test transcripts
        for (const sourceId of testSourceIds) {
            try {
                await storage.deleteAllVersions(sourceId);
            } catch (error) {
                console.warn(`Cleanup failed for ${sourceId}:`, error);
            }
        }
    });

    it('should upload a transcript string successfully and return the correct metadata', async () => {
        // This test ensures that the core transcript upload functionality works reliably,
        // which is fundamental to the entire system's value proposition. If users cannot
        // upload transcripts successfully, the system fails to provide any value, and
        // incomplete uploads could lead to data loss and user frustration.
        // 1. Upload the transcript
        const result = await storage.uploadTranscript(sampleTranscript, sampleMetadata);

        // 2. Verify we got expected response structure
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('blobKey');
        expect(result).toHaveProperty('metadata');

        // 3. Verify the returned metadata contains all expected fields
        const returnedMetadata = result.metadata;
        expect(returnedMetadata.sourceId).toBe(sampleMetadata.sourceId);
        expect(returnedMetadata.title).toBe(sampleMetadata.title);
        expect(returnedMetadata.date).toBe(sampleMetadata.date);
        expect(returnedMetadata.speakers).toEqual(sampleMetadata.speakers);
        expect(returnedMetadata.format).toBe(sampleMetadata.format);
        expect(returnedMetadata.processingStatus).toBe('pending');
        expect(returnedMetadata.version).toBe(1); // First version
        expect(returnedMetadata.tags).toEqual(sampleMetadata.tags);
        expect(returnedMetadata.uploadedAt).toBeTruthy(); // Just verify it's set

        // 4. Verify we can fetch the content back to confirm it was stored
        const storedTranscript = await storage.getTranscript(sampleMetadata.sourceId);

        // 5. Verify fetched content matches what we uploaded
        expect(storedTranscript.content).toBe(sampleTranscript);

        // 6. Verify the metadata in the database matches
        const { data, error } = await supabase
            .from('transcript_metadata')
            .select('*')
            .eq('source_id', sampleMetadata.sourceId)
            .single();

        expect(error).toBeNull();
        expect(data).toBeTruthy();
        expect(data?.title).toBe(sampleMetadata.title);
        expect(data?.blob_key).toBe(result.blobKey);
    }, TIMEOUT);

    it('should increment version numbers correctly for the same sourceId', async () => {
        // This test verifies that version management works correctly, which is critical
        // for allowing users to update transcripts while preserving their history.
        // Version conflicts or incorrect numbering could lead to data overwriting,
        // loss of transcript revisions, and confusion about which version is current.
        // Generate a unique sourceId for this test
        const versionTestSourceId = `version-test-${Date.now()}`;
        testSourceIds.push(versionTestSourceId);

        // Create metadata with the unique sourceId
        const versionMetadata = {
            ...sampleMetadata,
            sourceId: versionTestSourceId,
            title: "Version Test Transcript"
        };

        // 1. Upload first version
        const result1 = await storage.uploadTranscript(
            "First version content",
            versionMetadata
        );

        // Verify first version is version 1
        expect(result1.metadata.version).toBe(1);

        // 2. Upload second version
        const result2 = await storage.uploadTranscript(
            "Second version content",
            versionMetadata
        );

        // Verify second version is version 2
        expect(result2.metadata.version).toBe(2);

        // 3. Upload third version
        const result3 = await storage.uploadTranscript(
            "Third version content",
            versionMetadata
        );

        // Verify third version is version 3
        expect(result3.metadata.version).toBe(3);

        // 4. Verify we have 3 versions stored
        const versions = await storage.listVersions(versionTestSourceId);
        expect(versions.length).toBe(3);

        // 5. Verify versions are sorted with newest first
        expect(versions[0].metadata.version).toBe(3);
        expect(versions[1].metadata.version).toBe(2);
        expect(versions[2].metadata.version).toBe(1);

        // 6. Verify each version has the correct content
        const v1 = await storage.getTranscript(versionTestSourceId, 1);
        const v2 = await storage.getTranscript(versionTestSourceId, 2);
        const v3 = await storage.getTranscript(versionTestSourceId, 3);

        expect(v1.content).toBe("First version content");
        expect(v2.content).toBe("Second version content");
        expect(v3.content).toBe("Third version content");
    }, TIMEOUT);

    // Additional space for more upload functionality tests
});