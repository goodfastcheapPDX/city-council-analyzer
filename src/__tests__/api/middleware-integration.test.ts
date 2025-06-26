import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createTranscriptHandlers } from '@/app/api/transcripts/handlers';
import { createStorageForTestSync as createStorageForTest } from '@/lib/storage/factories/test';
import { TranscriptStorage } from '@/lib/storage/blob';
import { CorrelatedRequest } from '@/lib/logging/middleware';

/**
 * Integration tests for logging middleware integration
 * Verifies that API handlers work correctly with correlation context
 */
describe('Logging Middleware Integration', () => {
  let storage: TranscriptStorage;
  let handlers: ReturnType<typeof createTranscriptHandlers>;
  const testSourceIds: string[] = [];

  beforeEach(async () => {
    storage = createStorageForTest();
    handlers = createTranscriptHandlers();
  });

  afterEach(async () => {
    // Clean up test data
    for (const sourceId of testSourceIds) {
      try {
        await storage.deleteAllVersions(sourceId);
      } catch (error) {
        // Ignore cleanup errors for transcripts that may not exist
      }
    }
    testSourceIds.length = 0;
  });

  describe('Correlated Request Processing', () => {
    it('should handle GET requests with correlation context', async () => {
      // Create a mock correlated request
      const request = new NextRequest('http://localhost:3000/api/transcripts?limit=5') as CorrelatedRequest;
      request.correlation = {
        correlationId: 'test-correlation-123',
        parentId: undefined,
        startTime: new Date(),
        metadata: {
          endpoint: 'GET /api/transcripts',
          userAgent: 'test-agent',
        },
      };

      const response = await handlers.GET(request, storage);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('should handle POST requests with correlation context', async () => {
      const testTranscript = {
        content: JSON.stringify({ text: 'Test meeting content for middleware' }),
        metadata: {
          title: 'Middleware Test Meeting',
          date: '2024-01-15',
          speakers: ['Test Speaker'],
          format: 'json' as const,
          tags: ['middleware-test'],
        },
      };

      // Create a mock correlated request with body
      const request = new NextRequest('http://localhost:3000/api/transcripts', {
        method: 'POST',
        body: JSON.stringify(testTranscript),
        headers: {
          'Content-Type': 'application/json',
        },
      }) as CorrelatedRequest;
      
      request.correlation = {
        correlationId: 'test-upload-456',
        parentId: undefined,
        startTime: new Date(),
        metadata: {
          endpoint: 'POST /api/transcripts',
          contentType: 'application/json',
          userAgent: 'test-agent',
        },
      };

      const response = await handlers.POST(request, storage);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      
      // The response should have the structure from the storage layer
      expect(data).toHaveProperty('url');
      expect(data).toHaveProperty('blobKey');
      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('sourceId');
      expect(data.metadata.title).toBe('Middleware Test Meeting');
      
      // Track for cleanup
      if (data.metadata?.sourceId) {
        testSourceIds.push(data.metadata.sourceId);
      }
    });

    it('should handle requests without correlation context gracefully', async () => {
      // Test that handlers work even without correlation context
      const request = new NextRequest('http://localhost:3000/api/transcripts?limit=3');

      const response = await handlers.GET(request, storage);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('items');
      expect(data).toHaveProperty('total');
    });

    it('should preserve error handling with correlation context', async () => {
      // Create a mock storage that will throw an error
      const errorStorage = {
        ...storage,
        listTranscripts: async () => {
          throw new Error('Simulated middleware error');
        },
      } as TranscriptStorage;

      const request = new NextRequest('http://localhost:3000/api/transcripts') as CorrelatedRequest;
      request.correlation = {
        correlationId: 'test-error-789',
        parentId: undefined,
        startTime: new Date(),
        metadata: {
          endpoint: 'GET /api/transcripts',
          userAgent: 'test-agent',
        },
      };

      const response = await handlers.GET(request, errorStorage);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Failed to list transcripts');
    });
  });

  describe('Correlation Context Handling', () => {
    it('should work with various correlation metadata formats', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts') as CorrelatedRequest;
      request.correlation = {
        correlationId: 'test-metadata-abc',
        parentId: 'parent-request-123',
        startTime: new Date(),
        metadata: {
          endpoint: 'GET /api/transcripts',
          userAgent: 'Mozilla/5.0 Test Browser',
          referer: 'https://example.com',
          customField: 'custom-value',
          timestamp: new Date().toISOString(),
        },
      };

      const response = await handlers.GET(request, storage);
      
      expect(response.status).toBe(200);
      
      // Verify that the handler processed successfully despite extended metadata
      const data = await response.json();
      expect(data).toHaveProperty('items');
    });

    it('should handle malformed correlation context gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/transcripts') as CorrelatedRequest;
      
      // Set malformed correlation context
      request.correlation = {
        correlationId: '', // Empty correlation ID
        parentId: undefined,
        startTime: new Date(),
        metadata: null as any, // Null metadata
      };

      const response = await handlers.GET(request, storage);
      
      // Should still work despite malformed context
      expect(response.status).toBe(200);
    });
  });
});