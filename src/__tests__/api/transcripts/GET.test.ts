import { NextRequest } from 'next/server';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTranscriptSourceIdHandlers } from '@/app/api/transcripts/[sourceId]/handlers';
import { createStorageForTest } from '@/lib/storage/factories';
import { TranscriptStorage } from '@/lib/storage/blob';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

describe('GET /api/transcripts/[sourceId]', () => {
    dotenv.config({ path: '.env.test' });

    let testStorage: TranscriptStorage;
    let handlers: ReturnType<typeof createTranscriptSourceIdHandlers>;
    const testSourceIds: string[] = [];

    // Helper function to generate sourceIds the same way as runtime code
    function generateTestSourceId(): string {
        return `transcript_${randomUUID()}`;
    }

    beforeEach(async () => {
        // Create a realistic test storage instance
        testStorage = createStorageForTest();
        
        // Create handlers instance
        handlers = createTranscriptSourceIdHandlers();
    });

    afterEach(async () => {
        // Clean up test data
        for (const sourceId of testSourceIds) {
            try {
                await testStorage.deleteAllVersions(sourceId);
            } catch (error) {
                // Ignore cleanup errors for transcripts that may not exist
            }
        }
        testSourceIds.length = 0;
    });

    test('successfully retrieves a transcript with default version', async () => {
        // This test ensures that users can reliably access their transcripts through
        // the API, which is fundamental to the system's usability. If transcript
        // retrieval fails, users cannot view their uploaded content, breaking the
        // core value proposition of transcript storage and analysis.
        const sourceId = generateTestSourceId();
        
        // Set up test data with two versions
        await testStorage.uploadTranscript('This is version 1', {
            sourceId,
            title: 'Test Transcript 1',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        testSourceIds.push(sourceId);

        await testStorage.uploadTranscript('This is version 2', {
            sourceId,
            title: 'Test Transcript 1 Updated',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        
        // Create request with sourceId
        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}`);
        const response = await handlers.GET(request, {
            params: Promise.resolve({ sourceId })
        }, testStorage as any);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.content).toBe('This is version 2'); // Should return latest version
        expect(data.metadata.version).toBe(2);
        expect(data.metadata.sourceId).toBe(sourceId);
    });

    test('retrieves a specific version when requested', async () => {
        // This test verifies that version-specific retrieval works correctly,
        // allowing users to access historical versions of their transcripts.
        // This capability is crucial for comparing changes, reverting to previous
        // versions, and maintaining transcript evolution tracking.
        const sourceId = generateTestSourceId();
        
        // Set up test data with two versions
        await testStorage.uploadTranscript('This is version 1', {
            sourceId,
            title: 'Test Transcript 1',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        testSourceIds.push(sourceId);

        await testStorage.uploadTranscript('This is version 2', {
            sourceId,
            title: 'Test Transcript 1 Updated',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        
        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}?version=1`);
        const response = await handlers.GET(request, {
            params: Promise.resolve({ sourceId })
        }, testStorage as any);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.content).toBe('This is version 1');
        expect(data.metadata.version).toBe(1);
        expect(data.metadata.sourceId).toBe(sourceId);
    });

    test('lists all versions when requested', async () => {
        const sourceId = generateTestSourceId();
        
        // Set up test data with two versions
        await testStorage.uploadTranscript('This is version 1', {
            sourceId,
            title: 'Test Transcript 1',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        testSourceIds.push(sourceId);

        await testStorage.uploadTranscript('This is version 2', {
            sourceId,
            title: 'Test Transcript 1 Updated',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        
        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}?versions=true`);
        const response = await handlers.GET(request, {
            params: Promise.resolve({ sourceId })
        }, testStorage as any);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(2);

        // Check that we have both versions
        const versions = data.map((v: any) => v.metadata.version).sort();
        expect(versions).toEqual([1, 2]);

        // Verify structure of version metadata
        data.forEach((version: any) => {
            expect(version.metadata).toHaveProperty('version');
            expect(version.metadata).toHaveProperty('sourceId');
            expect(version).toHaveProperty('url');
            expect(version).toHaveProperty('blobKey');
        });
    });

    test('returns 404 for non-existent transcript', async () => {
        // This test ensures that the API provides clear, consistent error responses
        // for missing transcripts, helping users understand when they're requesting
        // invalid resources and preventing confusion about transcript availability.
        const request = new NextRequest('http://localhost/api/transcripts/nonexistent');
        const response = await handlers.GET(request, {
            params: Promise.resolve({ sourceId: 'nonexistent' })
        }, testStorage as any);

        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Failed to fetch transcript');
    });

    test('should handle non-numeric version parameter by returning latest version', async () => {
        const sourceId = generateTestSourceId();
        
        // Set up test data
        await testStorage.uploadTranscript('This is version 1', {
            sourceId,
            title: 'Test Transcript 1',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        testSourceIds.push(sourceId);
        
        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}?version=invalid`);
        const response = await handlers.GET(request, {
            params: Promise.resolve({ sourceId })
        }, testStorage as any);

        // The route parses 'invalid' as NaN, which gets treated as undefined, 
        // so the API returns the latest version (current behavior)
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.metadata.version).toBe(1); // Latest (and only) version
        expect(data.content).toBe('This is version 1');
    });

    test('handles error in storage service gracefully', async () => {
        // This test verifies that storage layer failures don't crash the API,
        // maintaining system stability during infrastructure issues. Graceful
        // error handling ensures users receive meaningful error messages rather
        // than system crashes, preserving user experience during outages.
        // Create a storage implementation that throws errors for testing
        const errorStorage = {
            getTranscript: async () => { throw new Error('Unexpected storage error'); },
            listVersions: async () => { throw new Error('Unexpected storage error'); }
        };

        const sourceId = generateTestSourceId();
        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}`);
        const response = await handlers.GET(request, {
            params: Promise.resolve({ sourceId })
        }, errorStorage as any);

        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Failed to fetch transcript');
    });

    // Testing with UUID-generated sourceIds like runtime
    test('should retrieve transcript successfully with realistic UUID-based sourceId', async () => {
        // Test with realistic UUID-generated sourceId like runtime code
        const sourceId = generateTestSourceId();
        await testStorage.uploadTranscript('UUID-based sourceId test', {
            sourceId,
            title: 'UUID Test Transcript',
            date: '2024-01-17',
            speakers: ['Speaker 3'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test', 'special']
        });
        testSourceIds.push(sourceId);

        const request = new NextRequest(`http://localhost/api/transcripts/${sourceId}`);
        const response = await handlers.GET(request, {
            params: Promise.resolve({ sourceId })
        }, testStorage as any);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.metadata.sourceId).toBe(sourceId);
    });

    // Property-based edge case tests
    test('should retrieve transcript with multiple versions correctly', async () => {
        // Test version retrieval with realistic storage - versions are auto-incremented
        const sourceId = generateTestSourceId();
        
        // Set up test data with two versions
        await testStorage.uploadTranscript('This is version 1', {
            sourceId,
            title: 'Test Transcript 1',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        testSourceIds.push(sourceId);

        await testStorage.uploadTranscript('This is version 2', {
            sourceId,
            title: 'Test Transcript 1 Updated',
            date: '2024-01-15',
            speakers: ['Speaker 1'],
            format: 'json',
            processingStatus: 'pending',
            tags: ['test']
        });
        
        const request1 = new NextRequest(`http://localhost/api/transcripts/${sourceId}?version=1`);
        const response1 = await handlers.GET(request1, {
            params: Promise.resolve({ sourceId })
        }, testStorage as any);

        expect(response1.status).toBe(200);
        const data1 = await response1.json();
        expect(data1.metadata.version).toBe(1);
        expect(data1.content).toBe('This is version 1');

        const request2 = new NextRequest(`http://localhost/api/transcripts/${sourceId}?version=2`);
        const response2 = await handlers.GET(request2, {
            params: Promise.resolve({ sourceId })
        }, testStorage as any);

        expect(response2.status).toBe(200);
        const data2 = await response2.json();
        expect(data2.metadata.version).toBe(2);
        expect(data2.content).toBe('This is version 2');
    });
});