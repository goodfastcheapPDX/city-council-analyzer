import { NextRequest } from 'next/server';
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createStorageForTest } from '@/lib/storage/factories';
import { TranscriptStorage } from '@/lib/storage/blob';
import { createTranscriptHandlers } from '@/app/api/transcripts/handlers';
import dotenv from 'dotenv';

// Test timeout for network operations
const TIMEOUT = 15000;

describe('GET /api/transcripts - Listing Endpoint Integration', () => {
    dotenv.config({ path: '.env.test' });

    let storage: TranscriptStorage;
    let handlers: ReturnType<typeof createTranscriptHandlers>;
    const testSourceIds: string[] = [];

    beforeAll(async () => {
        // Create real storage instance for integration testing
        storage = createStorageForTest();
        
        // Create handlers instance
        handlers = createTranscriptHandlers();
        
        // Initialize database
        await storage.initializeDatabase();

        // Create test transcripts to ensure we have data
        const testTranscripts = [
            {
                sourceId: `list-bug-test-1-${Date.now()}`,
                title: "Test Meeting 1",
                date: "2024-01-15",
                speakers: ["Alice", "Bob"],
                content: `{"meeting":"Test Meeting 1"}`
            },
            {
                sourceId: `list-bug-test-2-${Date.now()}`,
                title: "Test Meeting 2", 
                date: "2024-02-10",
                speakers: ["Charlie", "Dave"],
                content: `{"meeting":"Test Meeting 2"}`
            }
        ];

        // Upload test transcripts
        for (const transcript of testTranscripts) {
            await storage.uploadTranscript(transcript.content, {
                sourceId: transcript.sourceId,
                title: transcript.title,
                date: transcript.date,
                speakers: transcript.speakers,
                format: "json",
                processingStatus: "processed",
                processingCompletedAt: new Date().toISOString()
            });

            testSourceIds.push(transcript.sourceId);
        }

        // Give time for any eventual consistency
        await new Promise(resolve => setTimeout(resolve, 1000));
    }, TIMEOUT * 2);

    afterAll(async () => {
        // Clean up test transcripts
        for (const sourceId of testSourceIds) {
            try {
                await storage.deleteAllVersions(sourceId);
            } catch (error) {
                console.warn(`Cleanup failed for ${sourceId}:`, error);
            }
        }
    }, TIMEOUT);

    test('should return transcripts with items array populated when transcripts exist - Handler Test', async () => {
        // This test verifies that the GET handler returns proper data structure
        // when transcripts exist, ensuring users can see their uploaded transcripts.
        
        const request = new NextRequest('http://localhost:3000/api/transcripts');
        const response = await handlers.GET(request, storage);

        expect(response.status).toBe(200);

        const data = await response.json();
        
        // Verify response structure
        expect(data).toHaveProperty('items');
        expect(data).toHaveProperty('total');
        expect(Array.isArray(data.items)).toBe(true);
        
        // Verify we have the expected data
        expect(data.total).toBeGreaterThanOrEqual(2);
        expect(data.items.length).toBeGreaterThan(0);
        
        // Verify items have expected structure
        if (data.items.length > 0) {
            const item = data.items[0];
            expect(item).toHaveProperty('url');
            expect(item).toHaveProperty('blobKey');
            expect(item).toHaveProperty('metadata');
            expect(item.metadata).toHaveProperty('sourceId');
            expect(item.metadata).toHaveProperty('title');
            expect(item.metadata).toHaveProperty('date');
            expect(item.metadata).toHaveProperty('speakers');
        }
    }, TIMEOUT);

    test('should handle pagination parameters correctly - Handler Test', async () => {
        // This test verifies that when explicit pagination parameters are provided,
        // the handler works correctly with proper parameter handling.
        
        const request = new NextRequest('http://localhost:3000/api/transcripts?limit=5&cursor=0');
        const response = await handlers.GET(request, storage);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('items');
        expect(data).toHaveProperty('total');
        expect(data.items.length).toBeGreaterThan(0);
        expect(data.items.length).toBeLessThanOrEqual(5);
    }, TIMEOUT);

    test('should return empty result when no transcripts exist in isolated environment', async () => {
        // This test verifies that empty results are handled correctly when legitimately empty
        // We'll use a mock storage to return empty results to test this case
        
        const mockStorage = {
            listTranscripts: async () => ({ items: [], total: 0 })
        } as TranscriptStorage;

        const request = new NextRequest('http://localhost:3000/api/transcripts');
        const response = await handlers.GET(request, mockStorage);

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.items).toEqual([]);
        expect(data.total).toBe(0);
    }, TIMEOUT);

    test('should handle storage errors gracefully', async () => {
        // This test ensures that storage layer failures don't crash the handler
        
        const mockStorage = {
            listTranscripts: async () => {
                throw new Error('Database connection failed');
            }
        } as TranscriptStorage;

        const request = new NextRequest('http://localhost:3000/api/transcripts');
        const response = await handlers.GET(request, mockStorage);

        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data).toHaveProperty('error');
        expect(data.error).toBe('Failed to list transcripts');
    }, TIMEOUT);
});