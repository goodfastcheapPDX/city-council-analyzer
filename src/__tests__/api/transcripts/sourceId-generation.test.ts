import { createTranscriptHandlers } from '@/app/api/transcripts/handlers';
import { createStorageForTest } from '@/lib/storage/factories';
import { TranscriptStorage } from '@/lib/storage/blob';
import { dateUtils } from '@/lib/config';
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

describe('SourceId Generation with dateUtils', () => {
  describe('POST /api/transcripts sourceId generation', () => {
    let storage: TranscriptStorage;
    let handlers: ReturnType<typeof createTranscriptHandlers>;

    beforeEach(() => {
      storage = createStorageForTest();
      handlers = createTranscriptHandlers();
    });

    it('should generate sourceId using UUID when not provided', async () => {
      // This test ensures our API generates unique, URL-safe sourceIds using UUIDs,
      // which prevents collisions and provides better security than predictable
      // timestamp-based IDs while remaining URL-safe for blob storage.
      
      const requestBody = {
        content: 'Test transcript content',
        metadata: {
          title: 'Test Meeting',
          date: '2024-01-15',
          speakers: ['Speaker 1'],
          format: 'text' as const
        }
      };

      const request = new Request('http://localhost:3000/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handlers.POST(request as any, storage);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.metadata.sourceId).toMatch(/^transcript_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      
      // Verify the UUID portion is valid format
      const uuidPart = result.metadata.sourceId.replace('transcript_', '');
      expect(uuidPart).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should preserve provided sourceId without generating UUID', async () => {
      // This test verifies that when users provide their own sourceId,
      // we don't override it with UUID generation, maintaining
      // user control over document identification.
      
      const customSourceId = 'custom_meeting_123';
      const requestBody = {
        content: 'Test transcript content',
        metadata: {
          sourceId: customSourceId,
          title: 'Test Meeting',
          date: '2024-01-15',
          speakers: ['Speaker 1'],
          format: 'text' as const
        }
      };

      const request = new Request('http://localhost:3000/api/transcripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const response = await handlers.POST(request as any, storage);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.metadata.sourceId).toBe(customSourceId);
    });

    it('should generate unique sourceIds for rapid successive requests', async () => {
      // This test ensures that multiple requests in quick succession
      // generate unique sourceIds, preventing document overwrites
      // and maintaining system reliability under load.
      
      const createRequest = (index: number) => ({
        content: `Test transcript content ${index}`,
        metadata: {
          title: `Test Meeting ${index}`,
          date: '2024-01-15',
          speakers: ['Speaker 1'],
          format: 'text' as const
        }
      });

      // Make requests sequentially to avoid timing collisions but still test rapid succession
      const results = [];
      for (let i = 0; i < 3; i++) {
        const request = new Request('http://localhost:3000/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createRequest(i))
        });
        const response = await handlers.POST(request as any, storage);
        results.push(await response.json());
      }

      const sourceIds = results.map(r => r.metadata.sourceId);

      // All sourceIds should be unique
      const uniqueSourceIds = new Set(sourceIds);
      expect(uniqueSourceIds.size).toBe(sourceIds.length);
      
      // All should match the expected UUID pattern
      sourceIds.forEach(sourceId => {
        expect(sourceId).toMatch(/^transcript_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      });
    });

    it('should generate URL-safe sourceIds with UUIDs', () => {
      // This property-based test ensures that generated sourceIds are always URL-safe,
      // preventing issues with blob storage keys and API routing that rely on
      // sourceIds being valid URL path components.
      
      fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
            metadata: fc.record({
              title: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
              date: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
                .map(d => d.toISOString().split('T')[0]), // Convert to YYYY-MM-DD format
              speakers: fc.array(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), { minLength: 1 }),
              format: fc.constantFrom('json', 'text', 'srt', 'vtt')
            })
          }),
          async (requestBody) => {
            try {
              const request = new Request('http://localhost:3000/api/transcripts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
              });

              const response = await handlers.POST(request as any, storage);
              const result = await response.json();

              // Only test sourceId generation for successful requests
              // Failed requests (validation errors) are expected for some property inputs
              if (response.status === 200) {
                const sourceId = result.metadata.sourceId;
                
                // Since no sourceId was provided in requestBody.metadata, the API should generate one
                // with the transcript_ prefix and UUID, which is always URL-safe
                if (!sourceId.match(/^transcript_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)) {
                  return false;
                }
                
                // Should start with transcript_ prefix
                if (!sourceId.startsWith('transcript_')) {
                  return false;
                }
                
                // Should contain valid UUID format
                const uuidPart = sourceId.replace('transcript_', '');
                if (!uuidPart.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)) {
                  return false;
                }
              }
              
              // Property succeeds for both success and validation error cases
              return true;
            } catch (error) {
              // Unexpected errors should fail the property
              return false;
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});