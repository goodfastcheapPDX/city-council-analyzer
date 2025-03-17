import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/upload-url/route';
import { put } from '@vercel/blob';
import { config } from '@/lib/config';

// Mock dependencies
vi.mock('@vercel/blob', () => ({
    put: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
    config: {
        blob: {
            transcriptPathPrefix: 'test-transcripts',
            allowPublicAccess: false,
            expirationSeconds: 3600,
        },
    },
}));

vi.mock('next/server', () => ({
    NextRequest: vi.fn(),
    NextResponse: {
        json: vi.fn(),
    },
}));

vi.mock('nanoid', () => ({
    nanoid: vi.fn().mockReturnValue('123456789'),
}));

describe('Upload URL API Routes', () => {
    let mockRequest: NextRequest;

    beforeEach(() => {
        mockRequest = new NextRequest('http://localhost:3000/api/upload-url');
        vi.resetAllMocks();

        // Mock put function to return a presigned URL
        (put as Mock).mockResolvedValue({
            url: 'https://example.com/test-blob',
            uploadUrl: 'https://upload.example.com/test-blob',
        });
    });

    describe('GET /api/upload-url', () => {
        it('should generate a presigned URL for client-side uploads', async () => {
            // Setup URL with query params
            mockRequest = new NextRequest(
                'http://localhost:3000/api/upload-url?filename=test.json&contentType=application/json'
            );

            // Execute the handler
            await GET(mockRequest);

            // Check expectations
            expect(put).toHaveBeenCalledWith(
                expect.stringContaining('test-transcripts/upload_123456789/v1_'),
                expect.objectContaining({
                    access: 'private',
                    contentType: 'application/json',
                    multipart: true,
                    metadata: expect.objectContaining({
                        sourceId: expect.stringContaining('upload_'),
                        version: '1',
                        filename: 'test.json'
                    })
                })
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://example.com/test-blob',
                    uploadUrl: 'https://upload.example.com/test-blob',
                    sourceId: expect.stringContaining('upload_'),
                })
            );
        });

        it('should require a filename parameter', async () => {
            // Setup URL without filename
            mockRequest = new NextRequest('http://localhost:3000/api/upload-url');

            // Execute the handler
            await GET(mockRequest);

            // Check expectations
            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Filename is required' },
                { status: 400 }
            );
        });

        it('should handle errors during URL generation', async () => {
            // Setup URL with query params
            mockRequest = new NextRequest(
                'http://localhost:3000/api/upload-url?filename=test.json'
            );

            // Mock put error
            (put as Mock).mockRejectedValueOnce(new Error('Failed to generate URL'));

            // Execute the handler
            await GET(mockRequest);

            // Check expectations
            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Failed to generate upload URL' },
                { status: 500 }
            );
        });
    });

    describe('POST /api/upload-url', () => {
        it('should create an upload URL with metadata', async () => {
            // Mock request with valid body
            const validBody = {
                filename: 'test.json',
                contentType: 'application/json',
                metadata: {
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1', 'Speaker 2'],
                    sourceId: 'custom-id',
                    tags: ['meeting', 'test']
                }
            };

            mockRequest.json = vi.fn().mockResolvedValueOnce(validBody);

            // Execute the handler
            await POST(mockRequest);

            // Check expectations
            expect(put).toHaveBeenCalledWith(
                expect.stringContaining('test-transcripts/custom-id/v1_'),
                expect.objectContaining({
                    access: 'private',
                    contentType: 'application/json',
                    multipart: true,
                    metadata: expect.objectContaining({
                        sourceId: 'custom-id',
                        version: '1',
                        filename: 'test.json',
                        title: 'Test Transcript',
                        date: '2023-01-01',
                        speakers: expect.any(String), // JSON stringified
                        tags: expect.any(String), // JSON stringified
                    }),
                    expiresIn: config.blob.expirationSeconds
                })
            );

            expect(NextResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'https://example.com/test-blob',
                    uploadUrl: 'https://upload.example.com/test-blob',
                    sourceId: 'custom-id',
                    metadata: expect.objectContaining({
                        sourceId: 'custom-id',
                        version: 1
                    })
                })
            );
        });

        it('should validate request body', async () => {
            // Mock request with invalid body
            const invalidBody = {
                // Missing required fields
            };

            mockRequest.json = vi.fn().mockResolvedValueOnce(invalidBody);

            // Execute the handler
            await POST(mockRequest);

            // Check expectations
            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        });

        it('should handle errors during URL generation', async () => {
            // Mock request with valid body
            const validBody = {
                filename: 'test.json',
                contentType: 'application/json',
                metadata: {
                    title: 'Test Transcript',
                    date: '2023-01-01',
                    speakers: ['Speaker 1']
                }
            };

            mockRequest.json = vi.fn().mockResolvedValueOnce(validBody);

            // Mock put error
            (put as Mock).mockRejectedValueOnce(new Error('Failed to generate URL'));

            // Execute the handler
            await POST(mockRequest);

            // Check expectations
            expect(NextResponse.json).toHaveBeenCalledWith(
                { error: 'Failed to generate upload URL' },
                { status: 500 }
            );
        });
    });
});