import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/cron/cleanup-blobs/route';
import { list, del } from '@vercel/blob';
import { config } from '@/lib/config';

// Mock dependencies
vi.mock('@vercel/blob', () => ({
    list: vi.fn(),
    del: vi.fn(),
}));

vi.mock('@/lib/config', () => ({
    config: {
        blob: {
            transcriptPathPrefix: 'test-transcripts',
        },
    },
}));

vi.mock('next/server', () => ({
    NextRequest: vi.fn(),
    NextResponse: {
        json: vi.fn(),
    },
}));

describe('Cleanup Blobs Cron Job', () => {
    let mockRequest: NextRequest;
    const currentDate = new Date();

    // Create dates for testing
    const recentDate = new Date(currentDate);
    recentDate.setDate(currentDate.getDate() - 10); // 10 days ago

    const oldDate = new Date(currentDate);
    oldDate.setDate(currentDate.getDate() - 40); // 40 days ago

    beforeEach(() => {
        mockRequest = new NextRequest('http://localhost:3000/api/cron/cleanup-blobs');
        mockRequest.headers = {
            get: vi.fn().mockImplementation((name) => {
                if (name === 'authorization') return `Bearer ${process.env.CRON_SECRET || ''}`;
                return null;
            })
        };

        // Reset env variables
        process.env.CRON_SECRET = 'test-secret';

        vi.resetAllMocks();

        // Mock list function
        (list as Mock).mockResolvedValue({
            blobs: [
                {
                    url: 'https://example.com/recent-blob',
                    pathname: `${config.blob.transcriptPathPrefix}/transcript1/v1_123456`,
                    uploadedAt: recentDate.toISOString(),
                    size: 1024,
                },
                {
                    url: 'https://example.com/old-blob',
                    pathname: `${config.blob.transcriptPathPrefix}/transcript2/v1_123456`,
                    uploadedAt: oldDate.toISOString(),
                    size: 1024,
                },
            ],
        });
    });

    it('should clean up blobs older than 30 days', async () => {
        await GET(mockRequest);

        expect(list).toHaveBeenCalledWith({
            prefix: config.blob.transcriptPathPrefix,
        });

        // Should only delete the old blob
        expect(del).toHaveBeenCalledTimes(1);
        expect(del).toHaveBeenCalledWith(`${config.blob.transcriptPathPrefix}/transcript2/v1_123456`);

        expect(NextResponse.json).toHaveBeenCalledWith({
            success: true,
            cleanedCount: 1,
            message: 'Cleaned up 1 expired blobs',
        });
    });

    it('should verify authorization if CRON_SECRET is set', async () => {
        // Mock unauthorized request
        mockRequest.headers = {
            get: vi.fn().mockReturnValue('Bearer wrong-secret')
        };

        await GET(mockRequest);

        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: 'Unauthorized' },
            { status: 401 }
        );

        // Should not call list or del
        expect(list).not.toHaveBeenCalled();
        expect(del).not.toHaveBeenCalled();
    });

    it('should not require authorization if CRON_SECRET is not set', async () => {
        process.env.CRON_SECRET = '';

        mockRequest.headers = {
            get: vi.fn().mockReturnValue(null)
        };

        await GET(mockRequest);

        // Should proceed with cleanup
        expect(list).toHaveBeenCalled();
        expect(NextResponse.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
        }));
    });

    it('should handle errors during cleanup', async () => {
        // Mock list error
        (list as Mock).mockRejectedValueOnce(new Error('Failed to list blobs'));

        await GET(mockRequest);

        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: 'Failed to clean up blobs' },
            { status: 500 }
        );
    });
});