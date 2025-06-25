-- Fix Transcripts Storage Bucket MIME Types Based on Supabase Known Issues
-- This migration addresses known Supabase Storage issues with text/plain and application/json

-- Update the transcripts storage bucket with working MIME types
-- Based on GitHub issue: supabase/storage#43 where text/plain doesn't work but text/script does
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'text/json',                     -- Works better than application/json for JSON transcript formats
  'application/json',              -- Keep for compatibility but may have issues
  'text/script',                   -- Works for plain text (alternative to text/plain)
  'text/plain',                    -- Keep for compatibility
  'text/srt',                      -- SRT subtitle files
  'text/vtt',                      -- VTT subtitle files
  'application/octet-stream',      -- Fallback for various text formats
  'text/x-subrip',                 -- Alternative SRT MIME type
  'text/vnd.web-video-text-tracks', -- Alternative VTT MIME type
  '*'                              -- Allow all MIME types for development testing
]::text[]
WHERE id = 'transcripts';

-- Add comment explaining the workaround
COMMENT ON TABLE storage.buckets IS 'Note: Due to Supabase Storage bug, text/plain may not work. Use text/script for plain text files.';

-- Verify the update worked
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'transcripts';