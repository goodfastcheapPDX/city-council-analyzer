import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/transcripts/route';
import { TranscriptBlobStorage } from '@/lib/storage/blob';

// Mock dependencies
vi.mock('@/lib/storage/blob', () => ({
    TranscriptBlobStorage: vi.fn().mockImplementation(() => ({
        listTranscripts: vi.fn(),
        uploadTranscript: vi.fn(),
    })),
}));

vi.mock('next/server', () => ({
    NextRequest: vi.fn(),
    NextResponse: {
        json: vi.fn(),
    },
}));

describe('Transcripts API Routes', () => {
    let mockRequest: NextRequest;
    let mockBlobStorage: TranscriptBlobStorage;

    beforeEach(() => {
        mockRequest = new NextRequest('http://localhost:3000/api/transcripts');
        mockBlobStorage = new TranscriptBlobStorage();
        vi.resetAllMocks();
    });

    describe('GET /api/transcripts', () => {
        it('should return a list of transcripts', async () => {
            // Setup mock response
            const mockTranscripts = {
                items: [
                    {
                        url: 'https://example.com/transcript1',
                        blobKey: 'transcripts/transcript1/v1_123456',
                        metadata: {
                            sourceId: 'transcript1',
                            title: 'Test Transcript 1',
                            date: '2023-01-01',
                            speakers: ['Speaker 1', 'Speaker 2'],
                            version: 1,
                            format: 'json',
                            processingStatus: 'processed',
                            uploadedAt: new Date().toISOString(),
                        },
                        uploadedAt: new Date(),
                        size: 1024,
                    },
                ],
                hasMore: false,
            };

            (mockBlobStorage.listTranscripts as Mock).mockResolvedValueOnce(mockTranscripts);

            // Execute the handler
            await GET(mockRequest);

            // Check expectations
            expect(mockBlobStorage.listTranscripts).toHaveBeenCalled();
            expect(NextResponse.json).toHaveBeenCalledWith(mockTranscripts);
        });

        it('should handle errors when listing transcripts', async () => {
            // Setup mock error
            (mockBlobStorage.listTranscripts as Mock).mockRejectedValueOnce(
                new Error('Failed to list transcripts')
            );

            // Execute the handler
            await GET(mockRequest);

            // Check expectations
            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Failed to list transcripts' },
                { status: 500 }
            );
        });
    });

    describe('POST /api/transcripts', () => {
        it('should upload a new transcript', async () => {
            // Mock request with valid body
            const validBody = {
                content: '{"test": "content"}',
                metadata: {
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1', 'Speaker 2'],
                    format: 'json',
                    tags: ['meeting', 'test']
                }
            };

            mockRequest.json = vi.fn().mockResolvedValueOnce(validBody);

            // Mock upload response
            const mockUploadResult = {
                url: 'https://example.com/transcript',
                blobKey: 'transcripts/test_123456',
                metadata: {
                    sourceId: 'test_123456',
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1', 'Speaker 2'],
                    version: 1,
                    format: 'json',
                    processingStatus: 'pending',
                    uploadedAt: new Date().toISOString(),
                    tags: ['meeting', 'test']
                }
            };

            (mockBlobStorage.uploadTranscript as Mock).mockResolvedValueOnce(mockUploadResult);

            // Execute the handler
            await POST(mockRequest);

            // Check expectations
            expect(mockBlobStorage.uploadTranscript).toHaveBeenCalledWith(
                validBody.content,
                expect.objectContaining({
                    title: validBody.metadata.title,
                    date: validBody.metadata.date,
                    speakers: validBody.metadata.speakers,
                    format: validBody.metadata.format,
                    tags: validBody.metadata.tags
                })
            );

            expect(NextResponse.json).toHaveBeenCalledWith(mockUploadResult);
        });

        it('should validate request body', async () => {
            // Mock request with invalid body
            const invalidBody = {
                content: '',  // Empty content = invalid
                metadata: {
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: [],  // Empty speakers = invalid
                    format: 'json'
                }
            };

            mockRequest.json = vi.fn().mockResolvedValueOnce(invalidBody);

            // Execute the handler
            await POST(mockRequest);

            // Check expectations
            expect(NextResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: 'Invalid request body',
                    details: expect.any(Object)
                }),
                { status: 400 }
            );
        });

        it('should handle errors during upload', async () => {
            // Mock request with valid body
            const validBody = {
                content: '{"test": "content"}',
                metadata: {
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1'],
                    format: 'json'
                }
            };

            mockRequest.json = vi.fn().mockResolvedValueOnce(validBody);

            // Mock upload error
            (mockBlobStorage.uploadTranscript as Mock).mockRejectedValueOnce(
                new Error('Upload failed')
            );

            // Execute the handler
            await POST(mockRequest);

            // Check expectations
            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Failed to upload transcript' },
                { status: 500 }
            );
        });
    });
});