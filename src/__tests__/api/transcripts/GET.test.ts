import { NextRequest } from 'next/server';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/transcripts/[sourceId]/route';
import { TestTranscriptStorage } from '@/__tests__/test-utils/TestTranscriptStorage'
import * as factories from '@/lib/storage/factories';
import dotenv from 'dotenv';

describe('GET /api/transcripts/[sourceId]', () => {
    dotenv.config({ path: '.env.test' });

    let testStorage: TestTranscriptStorage;

    beforeEach(() => {
        // Create a new test storage instance for each test
        testStorage = new TestTranscriptStorage();

        // Mock the factory to return our test storage
        vi.spyOn(factories, 'createStorageForServer').mockResolvedValue(testStorage as any);

        // Set up test data
        testStorage.addTranscript('transcript1', 1, {
            id: 'transcript1',
            version: 1,
            content: 'This is version 1'
        });

        testStorage.addTranscript('transcript1', 2, {
            id: 'transcript1',
            version: 2,
            content: 'This is version 2'
        });

        testStorage.addTranscript('transcript2', 1, {
            id: 'transcript2',
            version: 1,
            content: 'Another transcript'
        });
    });

    afterEach(() => {
        // Clean up test data
        testStorage.clearAll();

        // Restore all mocks
        vi.restoreAllMocks();
    });

    test('successfully retrieves a transcript with default version', async () => {
        // Create request with sourceId
        const request = new NextRequest('http://localhost/api/transcripts/transcript1');
        const response = await GET(request, {
            params: Promise.resolve({ sourceId: 'transcript1' })
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.content).toBe('This is version 2'); // Should return latest version
        expect(data.metadata.version).toBe(2);
        expect(data.metadata.sourceId).toBe('transcript1');
    });

    test('retrieves a specific version when requested', async () => {
        const request = new NextRequest('http://localhost/api/transcripts/transcript1?version=1');
        const response = await GET(request, {
            params: Promise.resolve({ sourceId: 'transcript1' })
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.content).toBe('This is version 1');
        expect(data.metadata.version).toBe(1);
        expect(data.metadata.sourceId).toBe('transcript1');
    });

    test('lists all versions when requested', async () => {
        const request = new NextRequest('http://localhost/api/transcripts/transcript1?versions=true');
        const response = await GET(request, {
            params: Promise.resolve({ sourceId: 'transcript1' })
        });

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
        const request = new NextRequest('http://localhost/api/transcripts/nonexistent');
        const response = await GET(request, {
            params: Promise.resolve({ sourceId: 'nonexistent' })
        });

        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Failed to fetch transcript');
    });

    test('handles invalid version parameter gracefully', async () => {
        const request = new NextRequest('http://localhost/api/transcripts/transcript1?version=invalid');
        const response = await GET(request, {
            params: Promise.resolve({ sourceId: 'transcript1' })
        });

        // The route will try to parse 'invalid' as a number using parseInt, which returns NaN
        // We expect a 404 since that version won't exist
        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toHaveProperty('error');
    });

    test('handles error in storage service gracefully', async () => {
        // Create a storage implementation that throws errors for testing
        const errorStorage = {
            getTranscript: async () => { throw new Error('Unexpected storage error'); },
            listVersions: async () => { throw new Error('Unexpected storage error'); }
        };

        // Mock the factory to return our error-throwing storage
        vi.spyOn(factories, 'createStorageForServer').mockResolvedValue(errorStorage as any);

        const request = new NextRequest('http://localhost/api/transcripts/transcript1');
        const response = await GET(request, {
            params: Promise.resolve({ sourceId: 'transcript1' })
        });

        expect(response.status).toBe(404);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toContain('Failed to fetch transcript');
    });

    // Testing URL encoding/decoding with special characters
    test('handles sourceId with special characters', async () => {
        // Add a transcript with special characters in ID
        testStorage.addTranscript('transcript/with?special&chars', 1, {
            id: 'transcript/with?special&chars',
            version: 1,
            content: 'Special characters in ID'
        });

        const request = new NextRequest('http://localhost/api/transcripts/transcript%2Fwith%3Fspecial%26chars');
        const response = await GET(request, {
            params: Promise.resolve({ sourceId: 'transcript/with?special&chars' })
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.metadata.sourceId).toBe('transcript/with?special&chars');
    });

    // Property-based edge case tests
    test('handles large version numbers correctly', async () => {
        const largeVersion = Number.MAX_SAFE_INTEGER;
        testStorage.addTranscript('transcript1', largeVersion, {
            id: 'transcript1',
            version: largeVersion,
            content: 'Very large version number'
        });

        const request = new NextRequest(`http://localhost/api/transcripts/transcript1?version=${largeVersion}`);
        const response = await GET(request, {
            params: Promise.resolve({ sourceId: 'transcript1' })
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.metadata.version).toBe(largeVersion);
    });
});