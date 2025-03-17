import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { TranscriptProcessor } from '@/lib/storage/transcript-processor';
import { TranscriptBlobStorage, TranscriptMetadata } from '@/lib/storage/blob';

// Mock TranscriptBlobStorage
vi.mock('@/lib/storage/blob', () => {
    const mockMetadata: TranscriptMetadata = {
        sourceId: 'test-source-id',
        title: 'Test Transcript',
        date: '2023-01-01',
        speakers: ['Speaker 1', 'Speaker 2'],
        version: 1,
        format: 'json',
        processingStatus: 'pending',
        uploadedAt: new Date().toISOString(),
    };

    return {
        TranscriptBlobStorage: vi.fn().mockImplementation(() => ({
            getTranscript: vi.fn().mockResolvedValue({
                content: '{"test": "content"}',
                metadata: mockMetadata
            }),
            updateProcessingStatus: vi.fn().mockResolvedValue({
                ...mockMetadata,
                processingStatus: 'processed',
                processingCompletedAt: new Date().toISOString(),
            }),
        })),
        TranscriptMetadata: vi.fn(),
    };
});

describe('TranscriptProcessor', () => {
    let processor: TranscriptProcessor;
    let mockBlobStorage: TranscriptBlobStorage;

    beforeEach(() => {
        mockBlobStorage = new TranscriptBlobStorage();
        processor = new TranscriptProcessor(mockBlobStorage);
    });

    describe('processTranscript', () => {
        it('should successfully process a valid JSON transcript', async () => {
            // Setup mock to return valid JSON
            (mockBlobStorage.getTranscript as Mock).mockResolvedValueOnce({
                content: '{"segments": [{"text": "Hello", "speaker": "Speaker 1"}]}',
                metadata: {
                    sourceId: 'test-source-id',
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1', 'Speaker 2'],
                    version: 1,
                    format: 'json',
                    processingStatus: 'pending',
                    uploadedAt: new Date().toISOString(),
                }
            });

            const result = await processor.processTranscript('test-source-id', 1);

            expect(result.success).toBe(true);
            expect(mockBlobStorage.updateProcessingStatus).toHaveBeenCalledWith(
                'test-source-id',
                1,
                'processed'
            );
        });

        it('should fail when processing an invalid JSON transcript', async () => {
            // Setup mock to return invalid JSON
            (mockBlobStorage.getTranscript as Mock).mockResolvedValueOnce({
                content: '{"invalid": "structure"}',
                metadata: {
                    sourceId: 'test-source-id',
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1', 'Speaker 2'],
                    version: 1,
                    format: 'json',
                    processingStatus: 'pending',
                    uploadedAt: new Date().toISOString(),
                }
            });

            const result = await processor.processTranscript('test-source-id', 1);

            expect(result.success).toBe(false);
            expect(mockBlobStorage.updateProcessingStatus).toHaveBeenCalledWith(
                'test-source-id',
                1,
                'failed'
            );
        });

        it('should handle exceptions during processing', async () => {
            // Setup mock to throw an error
            (mockBlobStorage.getTranscript as Mock).mockRejectedValueOnce(
                new Error('Simulated error')
            );

            const result = await processor.processTranscript('test-source-id', 1);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Simulated error');
        });

        it('should validate different transcript formats correctly', async () => {
            // Test SRT format
            (mockBlobStorage.getTranscript as Mock).mockResolvedValueOnce({
                content: '1\n00:00:01,000 --> 00:00:04,000\nHello world',
                metadata: {
                    sourceId: 'test-source-id',
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1'],
                    version: 1,
                    format: 'srt',
                    processingStatus: 'pending',
                    uploadedAt: new Date().toISOString(),
                }
            });

            const srtResult = await processor.processTranscript('test-source-id', 1);
            expect(srtResult.success).toBe(true);

            // Test WebVTT format
            (mockBlobStorage.getTranscript as Mock).mockResolvedValueOnce({
                content: 'WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\nHello world',
                metadata: {
                    sourceId: 'test-source-id',
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1'],
                    version: 1,
                    format: 'vtt',
                    processingStatus: 'pending',
                    uploadedAt: new Date().toISOString(),
                }
            });

            const vttResult = await processor.processTranscript('test-source-id', 1);
            expect(vttResult.success).toBe(true);
        });
    });
});