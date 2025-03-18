import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, RefreshCw } from 'lucide-react';

// In a real implementation, these would be server actions or API calls
async function uploadTranscript(file: File) {
    // This is a mock implementation
    return new Promise<{ id: string; url: string }>((resolve) => {
        setTimeout(() => {
            resolve({
                id: Math.random().toString(36).substring(2, 9),
                url: URL.createObjectURL(file)
            });
        }, 1500);
    });
}

async function fetchTranscripts() {
    // This is a mock implementation
    return new Promise<Array<{ id: string; name: string; uploadedAt: Date; status: string }>>(
        (resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: '1',
                        name: 'Team Meeting - March 2023.json',
                        uploadedAt: new Date('2023-03-15'),
                        status: 'processed'
                    },
                    {
                        id: '2',
                        name: 'Customer Interview - April 2023.json',
                        uploadedAt: new Date('2023-04-20'),
                        status: 'processing'
                    },
                    {
                        id: '3',
                        name: 'Product Review - May 2023.json',
                        uploadedAt: new Date('2023-05-10'),
                        status: 'failed'
                    }
                ]);
            }, 1000);
        }
    );
}

interface TranscriptUploadProps {
    onUploadSuccess?: () => void;
}

export default function TranscriptUpload({ onUploadSuccess }: TranscriptUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast.error('Please select a file first');
            return;
        }

        try {
            setIsUploading(true);
            // Check if file is JSON
            if (!file.name.endsWith('.json')) {
                toast.error('Only JSON transcript files are supported');
                setIsUploading(false);
                return;
            }

            await uploadTranscript(file);
            toast.success('Transcript uploaded successfully');
            setFile(null);
            if (onUploadSuccess) {
                onUploadSuccess();
            }
            router.refresh();
        } catch (error) {
            toast.error('Failed to upload transcript');
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload New Transcript</CardTitle>
                <CardDescription>
                    Upload JSON transcript files for analysis. Only JSON format is supported.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid w-full items-center gap-4">
                    <div className="flex flex-col space-y-1.5">
                        <Label htmlFor="transcript">Transcript File</Label>
                        <Input
                            id="transcript"
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button onClick={() => setFile(null)} disabled={!file || isUploading}>
                    Clear
                </Button>
                <Button onClick={handleUpload} disabled={!file || isUploading}>
                    {isUploading ? (
                        <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

export function TranscriptList() {
    const [transcripts, setTranscripts] = useState<
        Array<{ id: string; name: string; uploadedAt: Date; status: string }>
    >([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadTranscripts = async () => {
        setIsLoading(true);
        try {
            const data = await fetchTranscripts();
            setTranscripts(data);
        } catch (error) {
            toast.error('Failed to load transcripts');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    // Load transcripts on component mount
    useState(() => {
        loadTranscripts();
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Your Transcripts</CardTitle>
                    <CardDescription>
                        View and manage your uploaded transcripts
                    </CardDescription>
                </div>
                <Button

                    onClick={loadTranscripts}
                    disabled={isLoading}
                    data-refresh
                >
                    <RefreshCw
                        className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                    />
                    <span className="sr-only">Refresh</span>
                </Button>
            </CardHeader>
            <CardContent>
                {transcripts.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                        {isLoading ? 'Loading transcripts...' : 'No transcripts found'}
                    </div>
                ) : (
                    <div className="divide-y">
                        {transcripts.map((transcript) => (
                            <div
                                key={transcript.id}
                                className="py-3 flex justify-between items-center"
                            >
                                <div>
                                    <h3 className="font-medium">{transcript.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        Uploaded {transcript.uploadedAt.toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center">
                                    <span
                                        className={`px-2 py-1 text-xs rounded-full ${transcript.status === 'processed'
                                            ? 'bg-green-100 text-green-800'
                                            : transcript.status === 'processing'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}
                                    >
                                        {transcript.status.charAt(0).toUpperCase() +
                                            transcript.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}