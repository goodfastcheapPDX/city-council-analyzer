// app/api/cron/cleanup-blobs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { del, list } from '@vercel/blob';
import { config } from '@/lib/config';

// This cron job runs daily to clean up expired blobs
// It's scheduled in vercel.json

export const dynamic = 'force-dynamic';

// Route handler for cron job
export async function GET(request: NextRequest) {
    // Verify cron secret if configured (recommended for production)
    if (process.env.CRON_SECRET) {
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        // List all transcript blobs
        const { blobs } = await list({
            prefix: config.blob.transcriptPathPrefix,
        });

        // Filter blobs that need to be deleted
        // For example, those marked for deletion or beyond retention period
        const now = new Date();
        const blobsToDelete = blobs.filter(blob => {
            // Get upload date
            const uploadDate = new Date(blob.uploadedAt);

            // Calculate age in days
            const ageInDays = (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);

            // Check against retention period (default 30 days)
            const retentionPeriodDays = 30;

            // Delete if older than retention period
            return ageInDays > retentionPeriodDays;
        });

        // Delete expired blobs
        if (blobsToDelete.length > 0) {
            await Promise.all(blobsToDelete.map(blob => del(blob.pathname)));
        }

        return NextResponse.json({
            success: true,
            cleanedCount: blobsToDelete.length,
            message: `Cleaned up ${blobsToDelete.length} expired blobs`,
        });
    } catch (error) {
        console.error('Error in blob cleanup cron:', error);
        return NextResponse.json(
            { error: 'Failed to clean up blobs' },
            { status: 500 }
        );
    }
}