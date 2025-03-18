import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <main className="min-h-screen bg-gray-50">
            <nav className="border-b bg-white p-4">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold">Transcript Analysis System</h1>
                    </div>
                    <div className="flex space-x-4">
                        <a href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                        <a href="/dashboard/transcripts" className="text-gray-600 hover:text-gray-900">Transcripts</a>
                        <a href="/dashboard/analysis" className="text-gray-600 hover:text-gray-900">Analysis</a>
                    </div>
                </div>
            </nav>
            {children}
        </main>
    );
}