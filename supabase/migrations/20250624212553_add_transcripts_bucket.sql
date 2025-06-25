-- Add Transcripts Storage Bucket
-- This migration creates the transcripts bucket for transcript file management

-- Create the transcripts storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcripts',
  'transcripts',
  true,  -- public access for development (should be false in production)
  52428800,  -- 50MB in bytes (50 * 1024 * 1024)
  ARRAY[
    'application/json',           -- JSON transcript formats
    'text/plain',                 -- Plain text transcripts
    'text/srt',                   -- SRT subtitle files
    'text/vtt',                   -- VTT subtitle files
    'application/octet-stream'    -- Fallback for various text formats
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket created successfully
-- Note: In local development, storage policies are managed automatically by Supabase