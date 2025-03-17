// tests/unit/storage/blob-comprehensive.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { TranscriptStorage, TranscriptMetadata } from '../../../lib/storage/blob';

// Mock the Vercel Blob functions
vi.mock('@vercel/blob', () => ({
  put: vi.fn().mockResolvedValue({
    url: 'https://example.com/blob',
    pathname: 'transcripts/test-id/v1_test-nanoid'
  }),
  del: vi.fn().mockResolvedValue(true),
  list: vi.fn(),
  head: vi.fn().mockResolvedValue({
    url: 'https://example.com/blob'
  })
}));

// In-memory storage for mock responses
interface MockDb {
  transcripts: Record<string, any[]>;
  latestVersions: Record<string, number>;
}

const mockDb: MockDb = {
  transcripts: {},
  latestVersions: {}
};

// Mock the Supabase client with functional behavior
vi.mock('@supabase/supabase-js', () => {
  // Functions to simulate Supabase behavior
  const mockSelectFn = (table: string) => {
    return {
      eq: (field: string, value: any) => {
        return {
          eq: (field2: string, value2: any) => {
            return {
              order: (field3: string, { ascending }: { ascending: boolean }) => {
                return {
                  limit: (limit: number) => {
                    // Simulate getting a specific version
                    if (table === 'transcript_metadata' && field === 'source_id') {
                      const versions = mockDb.transcripts[value] || [];
                      const filteredVersions = versions.filter(v => v.version === value2);
                      return Promise.resolve({
                        data: filteredVersions,
                        error: null
                      });
                    }
                    return Promise.resolve({ data: [], error: null });
                  }
                };
              }
            };
          },
          order: (field: string, { ascending }: { ascending: boolean }) => {
            return {
              limit: (limit: number) => {
                // Simulate getting latest version
                if (table === 'transcript_metadata' && field === 'source_id') {
                  const versions = mockDb.transcripts[value] || [];
                  const sortedVersions = [...versions].sort((a, b) =>
                    ascending ? a.version - b.version : b.version - a.version
                  );
                  const limitedVersions = sortedVersions.slice(0, limit);
                  return Promise.resolve({
                    data: limitedVersions,
                    error: null
                  });
                }
                return Promise.resolve({ data: [], error: null });
              }
            };
          }
        };
      }
    };
  };

  const mockInsertFn = (data: any) => {
    // Store in our mock database
    const sourceId = data.source_id;
    if (!mockDb.transcripts[sourceId]) {
      mockDb.transcripts[sourceId] = [];
    }
    mockDb.transcripts[sourceId].push(data);
    mockDb.latestVersions[sourceId] = data.version;

    return Promise.resolve({ data, error: null });
  };

  const mockDeleteFn = () => {
    return {
      eq: (field: string, value: string) => {
        return {
          eq: (field2: string, value2: number) => {
            // Delete specific version
            if (field === 'source_id' && field2 === 'version') {
              if (mockDb.transcripts[value]) {
                mockDb.transcripts[value] = mockDb.transcripts[value].filter(v => v.version !== value2);
              }
              return Promise.resolve({ error: null });
            }
            return Promise.resolve({ error: null });
          }
        };
      },
      filter: (field: string, operator: string, value: string) => {
        // Delete by filter (for cleanup)
        if (field === 'source_id' && operator === 'like' && value === 'test-%') {
          Object.keys(mockDb.transcripts).forEach(key => {
            if (key.startsWith('test-')) {
              delete mockDb.transcripts[key];
              delete mockDb.latestVersions[key];
            }
          });
        }
        return Promise.resolve({ error: null });
      }
    };
  };

  return {
    createClient: vi.fn(() => ({
      rpc: vi.fn(() => Promise.resolve({ error: null })),
      from: vi.fn((table: string) => ({
        insert: vi.fn(mockInsertFn),
        select: vi.fn(() => mockSelectFn(table)),
        delete: vi.fn(() => mockDeleteFn()),
        update: vi.fn(() => ({
          eq: (field: string, value: string) => ({
            eq: (field2: string, value2: number) => ({
              select: () => ({
                single: () => {
                  // Update processing status
                  if (field === 'source_id' && field2 === 'version') {
                    if (mockDb.transcripts[value]) {
                      const transcript = mockDb.transcripts[value].find(v => v.version === value2);
                      if (transcript) {
                        transcript.processing_status = 'processed';
                        transcript.processing_completed_at = new Date().toISOString();
                        return Promise.resolve({ data: transcript, error: null });
                      }
                    }
                  }
                  return Promise.resolve({ data: null, error: { message: 'Record not found' } });
                }
              })
            })
          })
        }))
      }))
    }))
  };
});

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-nanoid')
}));

// Mock global fetch
global.fetch = vi.fn().mockImplementation((url) => {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    text: () => Promise.resolve('{"transcript": "test content"}'),
    json: () => Promise.resolve({ transcript: "test content" }),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bodyUsed: false,
    body: null,
    clone: vi.fn(),
    redirected: false,
    type: 'basic',
    url: url.toString()
  } as unknown as Response);
});

describe('TranscriptStorage - Comprehensive Tests', () => {
  let storage: TranscriptStorage;
  const supabaseUrl = 'https://test.supabase.co';
  const supabaseKey = 'test-key';

  beforeEach(() => {
    storage = new TranscriptStorage(supabaseUrl, supabaseKey);
    vi.clearAllMocks();

    // Reset mock database
    Object.keys(mockDb.transcripts).forEach(key => {
      delete mockDb.transcripts[key];
    });
    Object.keys(mockDb.latestVersions).forEach(key => {
      delete mockDb.latestVersions[key];
    });
  });

  test('uploadTranscript should store content and metadata correctly', async () => {
    // Import required mocks
    const { put } = await import('@vercel/blob');

    // Test content and metadata
    const content = JSON.stringify({ transcript: "test content" });
    const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
      sourceId: 'test-id',
      title: 'Test Transcript',
      date: '2025-03-17',
      speakers: ['Speaker A', 'Speaker B'],
      format: 'json',
      processingStatus: 'pending',
      tags: ['test', 'transcript']
    };

    // Execute the function
    const result = await storage.uploadTranscript(content, metadata);

    // Assertions
    expect(put).toHaveBeenCalledWith(
      expect.stringContaining('transcripts/test-id/v1'),
      content,
      expect.objectContaining({
        contentType: 'application/json',
        access: 'public'
      })
    );

    expect(result).toEqual(expect.objectContaining({
      url: 'https://example.com/blob',
      metadata: expect.objectContaining({
        sourceId: 'test-id',
        version: 1,
        processingStatus: 'pending'
      })
    }));
  });

  test('should handle versioning correctly', async () => {
    // Setup initial state
    mockDb.transcripts['test-id'] = [{
      source_id: 'test-id',
      version: 1,
      blob_key: 'test-blob-key-1',
      url: 'https://example.com/blob/1',
      title: 'Test Transcript',
      date: '2025-03-17',
      speakers: ['Speaker A', 'Speaker B'],
      format: 'json',
      processing_status: 'processed',
      uploaded_at: new Date().toISOString(),
      tags: ['test']
    }];
    mockDb.latestVersions['test-id'] = 1;

    // Test content and metadata for version 2
    const content = JSON.stringify({ transcript: "updated content" });
    const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
      sourceId: 'test-id',
      title: 'Updated Transcript',
      date: '2025-03-18',
      speakers: ['Speaker A', 'Speaker B', 'Speaker C'],
      format: 'json',
      processingStatus: 'pending',
      tags: ['test', 'updated']
    };

    // Execute the function
    const result = await storage.uploadTranscript(content, metadata);

    // Assertions
    expect(result.metadata.version).toBe(2);
    expect(mockDb.transcripts['test-id'].length).toBe(2);
  });

  test('should update processing status correctly', async () => {
    // Setup initial state
    const timestamp = new Date().toISOString();
    mockDb.transcripts['test-id'] = [{
      source_id: 'test-id',
      version: 1,
      blob_key: 'test-blob-key-1',
      url: 'https://example.com/blob/1',
      title: 'Test Transcript',
      date: '2025-03-17',
      speakers: ['Speaker A', 'Speaker B'],
      format: 'json',
      processing_status: 'pending',
      uploaded_at: timestamp,
      tags: ['test']
    }];
    mockDb.latestVersions['test-id'] = 1;

    // Update status
    const result = await storage.updateProcessingStatus('test-id', 1, 'processed');

    // Assertions
    expect(result.processingStatus).toBe('processed');
    expect(result.processingCompletedAt).toBeDefined();
  });

  test('metadata consistency property holds during upload and retrieve', async () => {
    const { head } = await import('@vercel/blob');

    await fc.assert(
      fc.asyncProperty(
        // Generate random valid metadata
        fc.record({
          sourceId: fc.string({ minLength: 1 }).map(s => `test-${s}`),
          title: fc.string({ minLength: 1 }),
          date: fc.date().map(d => d.toISOString().split('T')[0]),
          speakers: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          format: fc.constantFrom('json', 'text', 'srt', 'vtt'),
          processingStatus: fc.constantFrom('pending', 'processed', 'failed'),
          tags: fc.option(fc.array(fc.string(), { maxLength: 5 }))
        }),
        async (metadata) => {
          const content = '{"transcript": "test content"}';

          // Upload
          await storage.uploadTranscript(content, metadata as any);

          // Setup fetch mock for retrieval
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            status: 200,
            text: () => Promise.resolve(content),
            json: () => Promise.resolve(JSON.parse(content)),
            headers: new Headers(),
            arrayBuffer: vi.fn(),
            blob: vi.fn(),
            formData: vi.fn(),
            bodyUsed: false,
            body: null,
            clone: vi.fn(),
            redirected: false,
            type: 'basic',
            url: 'https://example.com/blob',
            statusText: 'OK'
          } as unknown as Response);

          // Property check: Upload and retrieve should maintain metadata integrity
          const retrieved = await storage.getTranscript(metadata.sourceId);

          // The core property we want to verify
          return retrieved.metadata.sourceId === metadata.sourceId &&
            retrieved.metadata.title === metadata.title &&
            retrieved.metadata.speakers.length === metadata.speakers.length;
        }
      ),
      { numRuns: 5 } // Limit runs for unit tests
    );
  });
});