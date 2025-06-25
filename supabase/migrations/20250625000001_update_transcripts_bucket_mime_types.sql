-- Update Transcripts Storage Bucket MIME Types
-- This migration updates the transcripts bucket to accept more text file variations

-- Update the transcripts storage bucket to include more permissive MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/json',              -- JSON transcript formats
  'text/plain',                    -- Plain text transcripts (basic)
  'text/plain; charset=utf-8',     -- Plain text with charset specification
  'text/plain; charset=UTF-8',     -- Plain text with uppercase charset
  'text/srt',                      -- SRT subtitle files
  'text/vtt',                      -- VTT subtitle files
  'application/octet-stream',      -- Fallback for various text formats
  'text/x-subrip',                 -- Alternative SRT MIME type
  'text/vnd.web-video-text-tracks' -- Alternative VTT MIME type
]::text[]
WHERE id = 'transcripts';

-- Verify the update worked
-- This will show the updated configuration
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'transcripts';