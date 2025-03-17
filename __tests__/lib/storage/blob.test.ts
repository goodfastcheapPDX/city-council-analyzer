import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { TranscriptBlobStorage, TranscriptMetadata } from '@/lib/storage/blob';
import { put, del, list, head } from '@vercel/blob';

// Mock Vercel Blob functions
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
  list: vi.fn(),
  head: vi.fn(),
}));

describe('TranscriptBlobStorage', () => {
  let storage: TranscriptBlobStorage;
  const mockMetadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
    sourceId: 'test-source-id',
    title: 'Test Transcript',
    date: '2023-01-01',
    speakers: ['Speaker 1', 'Speaker 2'],
    format: 'json',
    processingStatus: 'pending',
  };

  beforeEach(() => {
    storage = new TranscriptBlobStorage('test-transcripts');
    vi.resetAllMocks();

    // Mock put function
    (put as Mock).mockResolvedValue({
      url: 'https://example.com/test-blob',
      pathname: 'test-transcripts/test-source-id/v1_123456',
    });

    // Mock list function
    (list as Mock).mockResolvedValue({
      blobs: [
        {
          url: 'https://example.com/test-blob-1',
          pathname: 'test-transcripts/test-source-id/v1_123456',
          uploadedAt: new Date().toISOString(),
          size: 1024,
          metadata: {
            sourceId: 'test-source-id',
            title: 'Test Transcript',
            date: '2023-01-01',
            speakers: JSON.stringify(['Speaker 1', 'Speaker 2']),
            version: '1',
            format: 'json',
            processingStatus: 'pending',
            uploadedAt: new Date().toISOString(),
          },
        },
      ],
      hasMore: false,
      cursor: 'test-cursor',
    });

    // Mock head function
    (head as Mock).mockResolvedValue({
      url: 'https://example.com/test-blob',
      pathname: 'test-transcripts/test-source-id/v1_123456',
      contentType: 'application/json',
      contentLength: 1024,
      uploadedAt: new Date().toISOString(),
      metadata: {
        sourceId: 'test-source-id',
        title: 'Test Transcript',
        date: '2023-01-01',
        speakers: JSON.stringify(['Speaker 1', 'Speaker 2']),
        version: '1',
        format: 'json',
        processingStatus: 'pending',
        uploadedAt: new Date().toISOString(),
      },
    });

    // Mock fetch for getTranscript
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('{"test": "content"}'),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadTranscript', () => {
    it('should upload a transcript with correct path and metadata', async () => {
      const result = await storage.uploadTranscript('{"test": "content"}', mockMetadata);

      expect(put).toHaveBeenCalledTimes(1);
      expect(result.url).toBe('https://example.com/test-blob');
      expect(result.metadata.version).toBe(1);
      expect(result.metadata.processingStatus).toBe('pending');
    });

    it('should increment version when a transcript already exists', async () => {
      // Setup list to return existing version 1
      (list as Mock).mockResolvedValueOnce({
        blobs: [
          {
            pathname: 'test-transcripts/test-source-id/v1_123456',
            metadata: { version: '1' },
            uploadedAt: new Date().toISOString(),
          }
        ],
      });

      const result = await storage.uploadTranscript('{"test": "content"}', mockMetadata);

      expect(result.metadata.version).toBe(2);
    });
  });

  describe('getTranscript', () => {
    it('should retrieve a transcript by sourceId and version', async () => {
      const result = await storage.getTranscript('test-source-id', 1);

      expect(head).toHaveBeenCalledTimes(1);
      expect(result.content).toBe('{"test": "content"}');
      expect(result.metadata.sourceId).toBe('test-source-id');
    });

    it('should throw an error if transcript not found', async () => {
      (head as Mock).mockResolvedValueOnce(null);

      await expect(storage.getTranscript('missing-id', 1))
        .rejects.toThrow('Transcript with sourceId missing-id and version 1 not found');
    });
  });

  describe('updateProcessingStatus', () => {
    it('should update the processing status of a transcript', async () => {
      const result = await storage.updateProcessingStatus('test-source-id', 1, 'processed');

      expect(put).toHaveBeenCalledTimes(1);
      expect(result.processingStatus).toBe('processed');
      expect(result.processingCompletedAt).toBeDefined();
    });
  });

  describe('listVersions', () => {
    it('should list all versions of a transcript sorted by version', async () => {
      (list as Mock).mockResolvedValueOnce({
        blobs: [
          {
            url: 'https://example.com/test-blob-1',
            pathname: 'test-transcripts/test-source-id/v1_123456',
            uploadedAt: new Date().toISOString(),
            size: 1024,
            metadata: { version: '1', sourceId: 'test-source-id', speakers: '[]' },
          },
          {
            url: 'https://example.com/test-blob-2',
            pathname: 'test-transcripts/test-source-id/v2_123456',
            uploadedAt: new Date().toISOString(),
            size: 1024,
            metadata: { version: '2', sourceId: 'test-source-id', speakers: '[]' },
          },
        ],
      });

      const versions = await storage.listVersions('test-source-id');

      expect(versions.length).toBe(2);
      expect(versions[0].metadata.version).toBe(2); // Sorted, so 2 is first
      expect(versions[1].metadata.version).toBe(1);
    });
  });

  describe('listTranscripts', () => {
    it('should list the latest version of each transcript', async () => {
      (list as Mock).mockResolvedValueOnce({
        blobs: [
          {
            url: 'https://example.com/transcript1-v1',
            pathname: 'test-transcripts/transcript1/v1_123456',
            uploadedAt: new Date().toISOString(),
            size: 1024,
            metadata: {
              sourceId: 'transcript1',
              version: '1',
              speakers: '[]',
              uploadedAt: new Date().toISOString()
            },
          },
          {
            url: 'https://example.com/transcript1-v2',
            pathname: 'test-transcripts/transcript1/v2_123456',
            uploadedAt: new Date().toISOString(),
            size: 1024,
            metadata: {
              sourceId: 'transcript1',
              version: '2',
              speakers: '[]',
              uploadedAt: new Date().toISOString()
            },
          },
          {
            url: 'https://example.com/transcript2-v1',
            pathname: 'test-transcripts/transcript2/v1_123456',
            uploadedAt: new Date().toISOString(),
            size: 1024,
            metadata: {
              sourceId: 'transcript2',
              version: '1',
              speakers: '[]',
              uploadedAt: new Date().toISOString()
            },
          },
        ],
        hasMore: false,
      });

      const result = await storage.listTranscripts();

      expect(result.items.length).toBe(2); // 2 unique transcripts
      expect(result.items.find(i => i.metadata.sourceId === 'transcript1')?.metadata.version).toBe(2);
    });
  });

  describe('deleteTranscriptVersion', () => {
    it('should delete a specific version of a transcript', async () => {
      await storage.deleteTranscriptVersion('test-source-id', 1);

      expect(del).toHaveBeenCalledTimes(1);
      expect(del).toHaveBeenCalledWith(expect.stringContaining('test-source-id/v1_'));
    });
  });

  describe('deleteAllVersions', () => {
    it('should delete all versions of a transcript', async () => {
      (list as Mock).mockResolvedValueOnce({
        blobs: [
          {
            url: 'https://example.com/test-blob-1',
            pathname: 'test-transcripts/test-source-id/v1_123456',
            metadata: { version: '1' },
            uploadedAt: new Date().toISOString(),
          },
          {
            url: 'https://example.com/test-blob-2',
            pathname: 'test-transcripts/test-source-id/v2_123456',
            metadata: { version: '2' },
            uploadedAt: new Date().toISOString(),
          },
        ],
      });

      await storage.deleteAllVersions('test-source-id');

      expect(del).toHaveBeenCalledTimes(2);
    });
  });
});