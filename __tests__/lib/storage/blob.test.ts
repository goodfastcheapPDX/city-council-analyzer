// tests/storage/transcript-storage.test.ts
import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { TranscriptStorage, TranscriptMetadata } from '../../../lib/storage/blob';
import * as fastCheck from 'fast-check';
import { createClient } from '@supabase/supabase-js';
import * as blobModule from '@vercel/blob';

// Setup a test Supabase client with Docker
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Mock modules
vi.mock('@vercel/blob', async () => {
  const actual = await vi.importActual('@vercel/blob');
  return {
    ...actual,
    put: vi.fn(),
    del: vi.fn(),
    head: vi.fn(),
    list: vi.fn(),
  };
});

// Test transcripts
const sampleTranscript = JSON.stringify({
  title: "Sample Transcript",
  speakers: ["Speaker A", "Speaker B"],
  segments: [
    { speaker: "Speaker A", text: "Hello world", start: 0, end: 2.5 },
    { speaker: "Speaker B", text: "Hi there", start: 2.6, end: 4.0 }
  ]
});

// Generate valid metadata using fast-check
const generateValidMetadata = (): fc.Arbitrary<Omit<TranscriptMetadata, 'uploadedAt' | 'version'>> => {
  return fc.record({
    sourceId: fc.string({ minLength: 5, maxLength: 20 }).filter(s => /^[a-z0-9-]+$/.test(s)),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    date: fc.date().map(d => d.toISOString()),
    speakers: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
    format: fc.constantFrom('json', 'text', 'srt', 'vtt'),
    processingStatus: fc.constantFrom('pending', 'processed', 'failed'),
    tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
  });
};

describe('TranscriptStorage', () => {
  let storage: TranscriptStorage;
  let supabase: ReturnType<typeof createClient>;

  beforeAll(async () => {
    // Connect to the Supabase instance
    supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize tables for testing
    const { error } = await supabase.rpc('initialize_transcript_tables');
    if (error) {
      console.error('Error initializing tables:', error);
    }
  });

  beforeEach(() => {
    // Create a fresh instance for each test
    storage = new TranscriptStorage(supabaseUrl, supabaseKey, 'test-transcripts');

    // Setup mocks with default responses
    vi.mocked(blobModule.put).mockResolvedValue({
      url: 'https://example.com/test-transcripts/test-123/v1_abc123',
      pathname: 'test-transcripts/test-123/v1_abc123',
      contentType: 'application/json',
      contentDisposition: 'inline',
    });

    vi.mocked(blobModule.head).mockResolvedValue({
      url: 'https://example.com/test-transcripts/test-123/v1_abc123',
      pathname: 'test-transcripts/test-123/v1_abc123',
      size: 1024,
      uploadedAt: new Date(),
      contentType: 'application/json',
      contentDisposition: 'inline',
      // Removed downloadUrl as it's not in the type
      cacheControl: 'public, max-age=31536000',
      meta: {
        sourceId: 'test-123',
        title: 'Test Transcript',
        date: new Date().toISOString(),
        speakers: JSON.stringify(['Speaker A', 'Speaker B']),
        version: '1',
        format: 'json',
        processingStatus: 'pending',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Setup fetch mock
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(sampleTranscript),
    });
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('transcript_metadata').delete().eq('source_id', 'test-123');
    vi.resetAllMocks();
  });

  afterAll(async () => {
    // Clean up all test data
    const { data } = await supabase
      .from('transcript_metadata')
      .select('source_id')
      .like('source_id', 'test-%');

    if (data && data.length > 0) {
      for (const item of data) {
        await supabase.from('transcript_metadata').delete().eq('source_id', item.source_id);
      }
    }
  });

  // 1. Test behavior, not implementation
  describe('uploadTranscript', () => {
    it('should return a valid response with transcript information', async () => {
      const metadata = {
        sourceId: 'test-123',
        title: 'Test Transcript',
        date: new Date().toISOString(),
        speakers: ['Speaker A', 'Speaker B'],
        format: 'json' as const,
        processingStatus: 'pending' as const,
      };

      const result = await storage.uploadTranscript(sampleTranscript, metadata);

      // Verify behavior - we got a valid response
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('blobKey');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.sourceId).toBe(metadata.sourceId);
      expect(result.metadata.title).toBe(metadata.title);
      expect(result.metadata.version).toBe(1); // First version

      // Verify it's persisted in Supabase
      const { data } = await supabase
        .from('transcript_metadata')
        .select('*')
        .eq('source_id', metadata.sourceId)
        .single();

      expect(data).not.toBeNull();
      expect(data!.source_id).toBe(metadata.sourceId);
    });

    // 2. Use property-based testing for edge cases
    it('should handle various valid metadata inputs', async () => {
      await fastCheck.assert(
        fastCheck.asyncProperty(
          generateValidMetadata(),
          async (metadata) => {
            const result = await storage.uploadTranscript(sampleTranscript, metadata);

            expect(result).toHaveProperty('url');
            expect(result).toHaveProperty('metadata');
            expect(result.metadata.sourceId).toBe(metadata.sourceId);
            expect(result.metadata.title).toBe(metadata.title);

            // Verify it's persisted in Supabase
            const { data } = await supabase
              .from('transcript_metadata')
              .select('*')
              .eq('source_id', metadata.sourceId)
              .single();

            return data !== null && data.source_id === metadata.sourceId;
          }
        ),
        { numRuns: 5 } // Limit runs to keep tests fast
      );
    });
  });

  describe('getTranscript', () => {
    it('should retrieve a transcript by sourceId and version', async () => {
      // Setup: First create a transcript
      const metadata = {
        sourceId: 'test-123',
        title: 'Test Transcript',
        date: new Date().toISOString(),
        speakers: ['Speaker A', 'Speaker B'],
        format: 'json' as const,
        processingStatus: 'pending' as const,
      };

      await storage.uploadTranscript(sampleTranscript, metadata);

      // Test: Retrieve the transcript
      const result = await storage.getTranscript('test-123', 1);

      // Verify content and metadata
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');
      expect(result.content).toBe(sampleTranscript);
      expect(result.metadata.sourceId).toBe(metadata.sourceId);
      expect(result.metadata.version).toBe(1);
    });

    it('should throw an error for nonexistent transcript', async () => {
      await expect(storage.getTranscript('nonexistent-id')).rejects.toThrow();
    });
  });

  describe('updateProcessingStatus', () => {
    it('should update the processing status of a transcript', async () => {
      // Setup: Create a transcript
      const metadata = {
        sourceId: 'test-123',
        title: 'Test Transcript',
        date: new Date().toISOString(),
        speakers: ['Speaker A', 'Speaker B'],
        format: 'json' as const,
        processingStatus: 'pending' as const,
      };

      await storage.uploadTranscript(sampleTranscript, metadata);

      // Test: Update status to processed
      const updatedMetadata = await storage.updateProcessingStatus('test-123', 1, 'processed');

      // Verify the status was updated
      expect(updatedMetadata.processingStatus).toBe('processed');
      expect(updatedMetadata.processingCompletedAt).toBeDefined();

      // Verify it was persisted
      const { data } = await supabase
        .from('transcript_metadata')
        .select('*')
        .eq('source_id', 'test-123')
        .eq('version', 1)
        .single();

      expect(data).not.toBeNull();
      expect(data!.processing_status).toBe('processed');
      expect(data!.processing_completed_at).not.toBeNull();
    });
  });

  describe('listVersions', () => {
    it('should list all versions of a transcript in descending order', async () => {
      // Setup: Create multiple versions
      const metadata = {
        sourceId: 'test-123',
        title: 'Test Transcript',
        date: new Date().toISOString(),
        speakers: ['Speaker A', 'Speaker B'],
        format: 'json' as const,
        processingStatus: 'pending' as const,
      };

      // Upload version 1
      await storage.uploadTranscript(sampleTranscript, metadata);

      // Upload version 2
      await storage.uploadTranscript(
        sampleTranscript,
        { ...metadata, title: 'Updated Test Transcript' }
      );

      // Test: List versions
      const versions = await storage.listVersions('test-123');

      // Verify versions are listed correctly
      expect(versions).toHaveLength(2);
      expect(versions[0].metadata.version).toBe(2); // Most recent first
      expect(versions[1].metadata.version).toBe(1);
      expect(versions[0].metadata.title).toBe('Updated Test Transcript');
    });

    it('should return an empty array for nonexistent transcripts', async () => {
      const versions = await storage.listVersions('nonexistent-id');
      expect(versions).toEqual([]);
    });
  });

  describe('listTranscripts', () => {
    it('should list latest versions of all transcripts', async () => {
      // Setup: Create multiple transcripts
      const transcripts = [
        {
          sourceId: 'test-123',
          title: 'Test Transcript 1',
          date: new Date().toISOString(),
          speakers: ['Speaker A', 'Speaker B'],
          format: 'json' as const,
          processingStatus: 'pending' as const,
        },
        {
          sourceId: 'test-456',
          title: 'Test Transcript 2',
          date: new Date().toISOString(),
          speakers: ['Speaker C', 'Speaker D'],
          format: 'json' as const,
          processingStatus: 'pending' as const,
        }
      ];

      // Upload transcripts
      for (const metadata of transcripts) {
        await storage.uploadTranscript(sampleTranscript, metadata);
      }

      // Add a second version of the first transcript
      await storage.uploadTranscript(
        sampleTranscript,
        { ...transcripts[0], title: 'Updated Test Transcript 1' }
      );

      // Test: List all transcripts
      const { items, total } = await storage.listTranscripts();

      // Verify list contains only latest versions
      expect(items.length).toBe(2);
      expect(total).toBe(2);

      // Check that we have the latest version of each transcript
      const transcript1 = items.find(i => i.metadata.sourceId === 'test-123');
      const transcript2 = items.find(i => i.metadata.sourceId === 'test-456');

      expect(transcript1).toBeDefined();
      expect(transcript2).toBeDefined();
      expect(transcript1?.metadata.version).toBe(2);
      expect(transcript1?.metadata.title).toBe('Updated Test Transcript 1');
      expect(transcript2?.metadata.version).toBe(1);
    });

    it('should respect pagination parameters', async () => {
      // Setup: Create multiple transcripts
      const transcripts = Array.from({ length: 5 }, (_, i) => ({
        sourceId: `test-${1000 + i}`,
        title: `Test Transcript ${i + 1}`,
        date: new Date().toISOString(),
        speakers: ['Speaker A', 'Speaker B'],
        format: 'json' as const,
        processingStatus: 'pending' as const,
      }));

      // Upload transcripts
      for (const metadata of transcripts) {
        await storage.uploadTranscript(sampleTranscript, metadata);
      }

      // Test: List with pagination
      const { items, total } = await storage.listTranscripts(2, 0);

      // Verify pagination works
      expect(items.length).toBe(2);
      expect(total).toBe(5);

      // Test next page
      const nextPage = await storage.listTranscripts(2, 2);
      expect(nextPage.items.length).toBe(2);

      // Ensure pages don't overlap
      const firstPageIds = items.map(i => i.metadata.sourceId);
      const secondPageIds = nextPage.items.map(i => i.metadata.sourceId);
      const intersection = firstPageIds.filter(id => secondPageIds.includes(id));
      expect(intersection.length).toBe(0);
    });
  });

  describe('searchTranscripts', () => {
    it('should find transcripts matching search criteria', async () => {
      // Setup: Create transcripts with different metadata
      const transcripts = [
        {
          sourceId: 'test-search-1',
          title: 'Financial Report Q1',
          date: '2023-01-15T00:00:00.000Z',
          speakers: ['John Doe', 'Jane Smith'],
          format: 'json' as const,
          processingStatus: 'processed' as const,
          tags: ['finance', 'quarterly']
        },
        {
          sourceId: 'test-search-2',
          title: 'Financial Report Q2',
          date: '2023-04-15T00:00:00.000Z',
          speakers: ['John Doe', 'Mark Johnson'],
          format: 'json' as const,
          processingStatus: 'processed' as const,
          tags: ['finance', 'quarterly']
        },
        {
          sourceId: 'test-search-3',
          title: 'Marketing Strategy',
          date: '2023-02-10T00:00:00.000Z',
          speakers: ['Sarah Connor', 'Jane Smith'],
          format: 'json' as const,
          processingStatus: 'pending' as const,
          tags: ['marketing', 'strategy']
        }
      ];

      // Upload transcripts
      for (const metadata of transcripts) {
        await storage.uploadTranscript(sampleTranscript, metadata);
      }

      // Test: Search by title
      const titleResults = await storage.searchTranscripts({ title: 'Financial' });
      expect(titleResults.items.length).toBe(2);
      expect(titleResults.items.every(i => i.metadata.title.includes('Financial'))).toBe(true);

      // Test: Search by speaker
      const speakerResults = await storage.searchTranscripts({ speaker: 'Jane Smith' });
      expect(speakerResults.items.length).toBe(2);

      // Test: Search by tag
      const tagResults = await storage.searchTranscripts({ tag: 'strategy' });
      expect(tagResults.items.length).toBe(1);
      expect(tagResults.items[0].metadata.sourceId).toBe('test-search-3');

      // Test: Search by date range
      const dateResults = await storage.searchTranscripts({
        dateFrom: '2023-02-01T00:00:00.000Z',
        dateTo: '2023-04-30T00:00:00.000Z'
      });
      expect(dateResults.items.length).toBe(2);

      // Test: Search by status
      const statusResults = await storage.searchTranscripts({ status: 'pending' });
      expect(statusResults.items.length).toBe(1);
      expect(statusResults.items[0].metadata.processingStatus).toBe('pending');

      // Test: Combined search
      const combinedResults = await storage.searchTranscripts({
        title: 'Financial',
        speaker: 'John Doe'
      });
      expect(combinedResults.items.length).toBe(2);
    });
  });

  describe('deleteTranscriptVersion', () => {
    it('should delete a specific version of a transcript', async () => {
      // Setup: Create multiple versions
      const metadata = {
        sourceId: 'test-123',
        title: 'Test Transcript',
        date: new Date().toISOString(),
        speakers: ['Speaker A', 'Speaker B'],
        format: 'json' as const,
        processingStatus: 'pending' as const,
      };

      // Upload version 1
      await storage.uploadTranscript(sampleTranscript, metadata);

      // Upload version 2
      await storage.uploadTranscript(
        sampleTranscript,
        { ...metadata, title: 'Updated Test Transcript' }
      );

      // Verify we have 2 versions
      const beforeDelete = await storage.listVersions('test-123');
      expect(beforeDelete.length).toBe(2);

      // Test: Delete version 1
      await storage.deleteTranscriptVersion('test-123', 1);

      // Verify only version 2 remains
      const afterDelete = await storage.listVersions('test-123');
      expect(afterDelete.length).toBe(1);
      expect(afterDelete[0].metadata.version).toBe(2);

      // Verify Blob storage deletion was called
      expect(blobModule.del).toHaveBeenCalled();
    });
  });

  describe('deleteAllVersions', () => {
    it('should delete all versions of a transcript', async () => {
      // Setup: Create multiple versions
      const metadata = {
        sourceId: 'test-123',
        title: 'Test Transcript',
        date: new Date().toISOString(),
        speakers: ['Speaker A', 'Speaker B'],
        format: 'json' as const,
        processingStatus: 'pending' as const,
      };

      // Upload multiple versions
      await storage.uploadTranscript(sampleTranscript, metadata);
      await storage.uploadTranscript(sampleTranscript, { ...metadata, title: 'V2' });
      await storage.uploadTranscript(sampleTranscript, { ...metadata, title: 'V3' });

      // Verify we have 3 versions
      const beforeDelete = await storage.listVersions('test-123');
      expect(beforeDelete.length).toBe(3);

      // Test: Delete all versions
      await storage.deleteAllVersions('test-123');

      // Verify all versions are deleted
      const afterDelete = await storage.listVersions('test-123');
      expect(afterDelete.length).toBe(0);

      // Verify Blob storage deletion was called multiple times
      expect(blobModule.del).toHaveBeenCalledTimes(3);
    });
  });

  // Contract test - ensure integration with Supabase works correctly
  describe('Contract test with Supabase', () => {
    // This uses a real Supabase instance in Docker, not mocks
    it('should correctly store and retrieve data from Supabase', async () => {
      // Override mocks to use real Vercel Blob API for this test
      vi.mocked(blobModule.put).mockImplementation(async (pathname, body, options) => {
        // Simplified version that just returns fake response
        const url = `https://example.com/${pathname}`;
        return {
          url,
          pathname,
          contentType: options?.contentType || 'application/json',
          contentDisposition: 'inline',
        };
      });

      // Use a fresh unique ID for this test
      const uniqueId = `test-contract-${Date.now()}`;

      // Upload to storage
      const uploadResult = await storage.uploadTranscript(
        sampleTranscript,
        {
          sourceId: uniqueId,
          title: 'Contract Test Transcript',
          date: new Date().toISOString(),
          speakers: ['Contract Speaker A', 'Contract Speaker B'],
          format: 'json',
          processingStatus: 'pending',
          tags: ['contract-test']
        }
      );

      // Directly verify in Supabase
      const { data } = await supabase
        .from('transcript_metadata')
        .select('*')
        .eq('source_id', uniqueId)
        .single();

      expect(data).not.toBeNull();
      expect(data!.source_id).toBe(uniqueId);
      expect(data!.title).toBe('Contract Test Transcript');
      expect(data!.tags).toContain('contract-test');

      // Clean up
      await supabase.from('transcript_metadata').delete().eq('source_id', uniqueId);
    });
  });
});