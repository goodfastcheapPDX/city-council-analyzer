'use client'
import TranscriptUpload, { TranscriptList } from '@/components/transcript/TranscriptUpload';
import { Toaster } from '@/components/ui/sonner';

export default function TranscriptsPage() {
    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Transcript Management</h1>
                <p className="text-gray-500">
                    Upload and manage transcripts for analysis. Transcripts are stored in Vercel Blob Storage
                    and processed to extract insights.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <TranscriptUpload
                        onUploadSuccess={() => {
                            // This would trigger a refresh of the transcript list
                            // In a more complete implementation, we'd use React Query or similar
                            // to manage data fetching and synchronization
                            const refreshButton = document.querySelector('button[data-refresh]') as HTMLButtonElement;
                            if (refreshButton) {
                                refreshButton.click();
                            }
                        }}
                    />
                </div>
                <div>
                    <TranscriptList />
                </div>
            </div>

            <Toaster />
        </div>
    );
}