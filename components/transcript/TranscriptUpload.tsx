// components/transcript/TranscriptUpload.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { TranscriptMetadata } from '@/lib/storage/blob';
import { Loader2, Upload, File, CheckCircle, AlertCircle } from 'lucide-react';

export function TranscriptList() {
    const [transcripts, setTranscripts] = useState<Array<{
        url: string;
        blobKey: string;
        metadata: TranscriptMetadata;
        uploadedAt: string;
        size: number;
    }>>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTranscripts = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/transcripts');
            if (!response.ok) {
                throw new Error('Failed to fetch transcripts');
            }
            const data = await response.json();
            setTranscripts(data.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            toast({
                title: 'Error',
                description: 'Failed to load transcripts',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: TranscriptMetadata['processingStatus']) => {
        switch (status) {
            case 'processed':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'failed':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case 'pending':
                return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
            default:
                return null;
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Uploaded Transcripts</CardTitle>
                        <CardDescription>
                            View and manage your uploaded transcripts
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        onClick={fetchTranscripts}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="bg-red-50 p-4 rounded-md mb-4">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : transcripts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <File className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                        <p>No transcripts found. Upload your first transcript to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {transcripts.map((transcript) => (
                            <div
                                key={transcript.blobKey}
                                className="border rounded-md p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium">{transcript.metadata.title}</h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(transcript.metadata.date).toLocaleDateString()} •
                                            {transcript.metadata.speakers.join(', ')}
                                        </p>
                                        {transcript.metadata.tags && transcript.metadata.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {transcript.metadata.tags.map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-xs text-gray-500 mr-2">
                                            Version {transcript.metadata.version}
                                        </span>
                                        {getStatusIcon(transcript.metadata.processingStatus)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default TranscriptUpload;

interface TranscriptUploadProps {
    onUploadSuccess?: (result: any) => void;
    onUploadError?: (error: string) => void;
}

export function TranscriptUpload({ onUploadSuccess, onUploadError }: TranscriptUploadProps) {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [speakers, setSpeakers] = useState('');
    const [format, setFormat] = useState<TranscriptMetadata['format']>('json');
    const [tags, setTags] = useState('');
    const [content, setContent] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!title.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Title is required',
                variant: 'destructive'
            });
            return;
        }

        if (!content.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Transcript content is required',
                variant: 'destructive'
            });
            return;
        }

        // Split speakers and tags by comma
        const speakersArray = speakers
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        const tagsArray = tags
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        if (speakersArray.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'At least one speaker is required',
                variant: 'destructive'
            });
            return;
        }

        const payload = {
            content,
            metadata: {
                title,
                date,
                speakers: speakersArray,
                format,
                tags: tagsArray.length > 0 ? tagsArray : undefined
            }
        };

        setIsUploading(true);

        try {
            const response = await fetch('/api/transcripts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload transcript');
            }

            const result = await response.json();

            toast({
                title: 'Upload Successful',
                description: `Transcript "${title}" uploaded successfully`,
                variant: 'default'
            });

            // Reset form
            setTitle('');
            setDate(new Date().toISOString().split('T')[0]);
            setSpeakers('');
            setFormat('json');
            setTags('');
            setContent('');

            // Callback
            if (onUploadSuccess) {
                onUploadSuccess(result);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            toast({
                title: 'Upload Failed',
                description: errorMessage,
                variant: 'destructive'
            });

            // Callback
            if (onUploadError) {
                onUploadError(errorMessage);
            }
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Upload Transcript</CardTitle>
                <CardDescription>
                    Upload a new transcript for processing and analysis
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Transcript title"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="speakers">
                            Speakers (comma separated)
                        </Label>
                        <Input
                            id="speakers"
                            value={speakers}
                            onChange={(e) => setSpeakers(e.target.value)}
                            placeholder="John Doe, Jane Smith"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="format">Format</Label>
                        <Select
                            value={format}
                            onValueChange={(value) => setFormat(value as TranscriptMetadata['format'])}
                        >
                            <SelectTrigger id="format">
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="json">JSON</SelectItem>
                                <SelectItem value="text">Plain Text</SelectItem>
                                <SelectItem value="srt">SRT</SelectItem>
                                <SelectItem value="vtt">WebVTT</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tags">
                        Tags (comma separated, optional)
                    </Label>
                    <Input
                        id="tags"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="meeting, interview, podcast"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="content">Transcript Content</Label>
                    <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Paste your transcript content here..."
                        className="min-h-[200px] font-mono text-sm"
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
                <Button
                    variant="outline"
                    onClick={() => {
                        setTitle('');
                        setDate(new Date().toISOString().split('T')[0]);
                        setSpeakers('');
                        setFormat('json');
                        setTags('');
                        setContent('');
                    }}
                    disabled={isUploading}
                >
                    Reset
                </Button>
                <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
        </Card>)
}