/**
 * Global test setup file
 */

// Set up DOM environment for components
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.ENABLE_PROCESSING = 'true';
process.env.CRON_SECRET = 'test-secret';

// Create mock for the TranscriptBlobStorage class
vi.mock('@/lib/storage/blob', async () => {
    const actual = await vi.importActual('@/lib/storage/blob');

    return {
        ...actual,
        TranscriptBlobStorage: vi.fn().mockImplementation(() => ({
            uploadTranscript: vi.fn().mockResolvedValue({
                url: 'https://example.com/transcript',
                blobKey: 'test-key',
                metadata: {
                    sourceId: 'test-source-id',
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1'],
                    version: 1,
                    format: 'json',
                    processingStatus: 'pending',
                    uploadedAt: new Date().toISOString(),
                }
            }),
            getTranscript: vi.fn().mockResolvedValue({
                content: '{"test": "content"}',
                metadata: {
                    sourceId: 'test-source-id',
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1'],
                    version: 1,
                    format: 'json',
                    processingStatus: 'pending',
                    uploadedAt: new Date().toISOString(),
                }
            }),
            listTranscripts: vi.fn().mockResolvedValue({
                items: [],
                hasMore: false
            }),
            updateProcessingStatus: vi.fn(),
            listVersions: vi.fn().mockResolvedValue([]),
            deleteTranscriptVersion: vi.fn(),
            deleteAllVersions: vi.fn(),
        })),
    };
});