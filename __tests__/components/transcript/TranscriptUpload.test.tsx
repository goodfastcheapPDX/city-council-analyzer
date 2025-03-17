import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranscriptUpload, { TranscriptList } from '@/components/transcript/TranscriptUpload';
import { toast } from '@/hooks/use-toast';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
    toast: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('TranscriptUpload Component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        // Mock successful fetch response
        (global.fetch as Mock).mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                url: 'https://example.com/transcript',
                blobKey: 'test-key',
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
            }),
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the upload form', () => {
        render(<TranscriptUpload onUploadSuccess={() => { }} />);

        expect(screen.getByText('Upload Transcript')).toBeInTheDocument();
        expect(screen.getByLabelText('Title')).toBeInTheDocument();
        expect(screen.getByLabelText('Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Speakers (comma separated)')).toBeInTheDocument();
        expect(screen.getByLabelText('Format')).toBeInTheDocument();
        expect(screen.getByLabelText('Tags (comma separated, optional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Transcript Content')).toBeInTheDocument();
        expect(screen.getByText('Upload')).toBeInTheDocument();
        expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    it('should handle form submission with valid data', async () => {
        const mockOnUploadSuccess = vi.fn();

        render(<TranscriptUpload onUploadSuccess={mockOnUploadSuccess} />);

        // Fill in the form
        await userEvent.type(screen.getByLabelText('Title'), 'Test Transcript');
        await userEvent.type(screen.getByLabelText('Speakers (comma separated)'), 'John Doe, Jane Smith');
        await userEvent.type(screen.getByLabelText('Transcript Content'), '{"test": "content"}');

        // Submit the form
        await userEvent.click(screen.getByText('Upload'));

        await waitFor(() => {
            // Check that fetch was called with the right arguments
            expect(global.fetch).toHaveBeenCalledWith('/api/transcripts', expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: expect.stringContaining('Test Transcript')
            }));

            // Check that success callback was called
            expect(mockOnUploadSuccess).toHaveBeenCalled();

            // Check that toast was called
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Upload Successful',
                variant: 'default'
            }));
        });
    });

    it('should validate required fields', async () => {
        render(<TranscriptUpload onUploadSuccess={() => { }} />);

        // Submit without filling required fields
        await userEvent.click(screen.getByText('Upload'));

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Validation Error',
                description: 'Title is required',
                variant: 'destructive'
            }));
        });

        // Fill title but not content
        await userEvent.type(screen.getByLabelText('Title'), 'Test Transcript');
        await userEvent.click(screen.getByText('Upload'));

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Validation Error',
                description: 'Transcript content is required',
                variant: 'destructive'
            }));
        });

        // Fill content but not speakers
        await userEvent.type(screen.getByLabelText('Transcript Content'), '{"test": "content"}');
        await userEvent.click(screen.getByText('Upload'));

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Validation Error',
                description: 'At least one speaker is required',
                variant: 'destructive'
            }));
        });
    });

    it('should handle API errors', async () => {
        const mockOnUploadError = vi.fn();

        // Mock fetch error response
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: false,
            json: vi.fn().mockResolvedValue({
                error: 'Server error'
            }),
        });

        render(<TranscriptUpload onUploadSuccess={() => { }} onUploadError={mockOnUploadError} />);

        // Fill in the form
        await userEvent.type(screen.getByLabelText('Title'), 'Test Transcript');
        await userEvent.type(screen.getByLabelText('Speakers (comma separated)'), 'John Doe');
        await userEvent.type(screen.getByLabelText('Transcript Content'), '{"test": "content"}');

        // Submit the form
        await userEvent.click(screen.getByText('Upload'));

        await waitFor(() => {
            // Check that error callback was called
            expect(mockOnUploadError).toHaveBeenCalledWith('Server error');

            // Check that toast was called with error
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Upload Failed',
                variant: 'destructive'
            }));
        });
    });

    it('should reset form on Reset button click', async () => {
        render(<TranscriptUpload onUploadSuccess={() => { }} />);

        // Fill in the form
        await userEvent.type(screen.getByLabelText('Title'), 'Test Transcript');
        await userEvent.type(screen.getByLabelText('Speakers (comma separated)'), 'John Doe');
        await userEvent.type(screen.getByLabelText('Transcript Content'), '{"test": "content"}');

        // Click reset
        await userEvent.click(screen.getByText('Reset'));

        // Form should be cleared
        expect(screen.getByLabelText('Title')).toHaveValue('');
        expect(screen.getByLabelText('Speakers (comma separated)')).toHaveValue('');
        expect(screen.getByLabelText('Transcript Content')).toHaveValue('');
    });
});

describe('TranscriptList Component', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should fetch and display transcripts', async () => {
        // Mock successful fetch response
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({
                items: [
                    {
                        url: 'https://example.com/transcript1',
                        blobKey: 'test-key-1',
                        metadata: {
                            sourceId: 'transcript1',
                            title: 'Test Transcript 1',
                            date: '2023-01-01',
                            speakers: ['Speaker 1', 'Speaker 2'],
                            version: 1,
                            format: 'json',
                            processingStatus: 'processed',
                            uploadedAt: new Date().toISOString(),
                            tags: ['meeting', 'test']
                        },
                        uploadedAt: new Date().toISOString(),
                        size: 1024,
                    },
                    {
                        url: 'https://example.com/transcript2',
                        blobKey: 'test-key-2',
                        metadata: {
                            sourceId: 'transcript2',
                            title: 'Test Transcript 2',
                            date: '2023-01-02',
                            speakers: ['Speaker 3'],
                            version: 2,
                            format: 'json',
                            processingStatus: 'pending',
                            uploadedAt: new Date().toISOString(),
                        },
                        uploadedAt: new Date().toISOString(),
                        size: 2048,
                    },
                ],
            }),
        });

        render(<TranscriptList />);

        // Click refresh button
        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() => {
            // API called correctly
            expect(global.fetch).toHaveBeenCalledWith('/api/transcripts');

            // Transcripts displayed
            expect(screen.getByText('Test Transcript 1')).toBeInTheDocument();
            expect(screen.getByText('Test Transcript 2')).toBeInTheDocument();

            // Speaker info displayed
            expect(screen.getByText(/Speaker 1, Speaker 2/)).toBeInTheDocument();
            expect(screen.getByText(/Speaker 3/)).toBeInTheDocument();

            // Tags displayed
            expect(screen.getByText('meeting')).toBeInTheDocument();
            expect(screen.getByText('test')).toBeInTheDocument();

            // Version info displayed
            expect(screen.getByText('Version 1')).toBeInTheDocument();
            expect(screen.getByText('Version 2')).toBeInTheDocument();
        });
    });

    it('should show loading state while fetching', async () => {
        // Delay fetch response
        (global.fetch as Mock).mockImplementationOnce(() => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve({
                        ok: true,
                        json: () => Promise.resolve({ items: [] }),
                    });
                }, 100);
            });
        });

        render(<TranscriptList />);

        // Click refresh button
        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        // Should show loading state immediately
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeDisabled();

        await waitFor(() => {
            // Button should be enabled after loading
            expect(screen.getByRole('button', { name: 'Refresh' })).not.toBeDisabled();
        });
    });

    it('should handle API errors', async () => {
        // Mock fetch error
        (global.fetch as Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

        render(<TranscriptList />);

        // Click refresh button
        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() => {
            // Error toast shown
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Error',
                description: 'Failed to load transcripts',
                variant: 'destructive',
            }));

            // Error message displayed
            expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
        });
    });

    it('should display an empty state when no transcripts exist', async () => {
        // Mock empty response
        (global.fetch as Mock).mockResolvedValueOnce({
            ok: true,
            json: vi.fn().mockResolvedValue({ items: [] }),
        });

        render(<TranscriptList />);

        // Click refresh button
        await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));

        await waitFor(() => {
            // Empty state message displayed
            expect(screen.getByText(/No transcripts found/)).toBeInTheDocument();
        });
    });
});