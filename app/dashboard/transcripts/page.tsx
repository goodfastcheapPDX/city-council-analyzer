// app/dashboard/transcripts/page.tsx
import { Metadata } from 'next';
import TranscriptUpload, { TranscriptList } from '@/components/transcript/TranscriptUpload';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
    title: 'Transcript Management | Transcript Analysis System',
    description: 'Upload and manage transcripts for analysis',
};

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

// app/dashboard/transcripts/layout.tsx
import { ReactNode } from 'react';

export default function TranscriptsLayout({ children }: { children: ReactNode }) {
    return (
        <main className="min-h-screen bg-gray-50">
            <nav className="border-b bg-white p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold">Transcript Analysis System</h1>
                    </div>
                    <div className="flex space-x-4">
                        <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                        <a href="/dashboard/transcripts" className="text-blue-600 font-medium">Transcripts</a>
                        <a href="/dashboard/analysis" className="text-gray-600 hover:text-gray-900">Analysis</a>
                    </div>
                </div>
            </nav>
            {children}
        </main>
    );
}