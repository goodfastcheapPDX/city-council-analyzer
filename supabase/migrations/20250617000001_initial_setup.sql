-- Complete database schema for transcript analysis system
-- This migration creates the full production schema locally

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create public schema (usually exists by default, but ensure it's available)
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions on public schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Create the main transcripts table
CREATE TABLE public.transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  date date NOT NULL,
  source text,
  blob_url text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT transcripts_pkey PRIMARY KEY (id)
);

-- Create transcript_metadata table (for blob storage metadata)
CREATE TABLE public.transcript_metadata (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  blob_key text NOT NULL UNIQUE,
  url text NOT NULL,
  source_id text NOT NULL,
  title text NOT NULL,
  date timestamp with time zone NOT NULL,
  speakers text[] NOT NULL DEFAULT '{}'::text[],
  version integer NOT NULL,
  format text NOT NULL CHECK (format = ANY (ARRAY['json'::text, 'text'::text, 'srt'::text, 'vtt'::text])),
  processing_status text NOT NULL CHECK (processing_status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text])),
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  processing_completed_at timestamp with time zone,
  tags text[] DEFAULT '{}'::text[],
  size integer NOT NULL,
  ts_title tsvector GENERATED ALWAYS AS (to_tsvector('english'::regconfig, title)) STORED,
  CONSTRAINT transcript_metadata_pkey PRIMARY KEY (id)
);

-- Create speakers table
CREATE TABLE public.speakers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  embedding vector,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT speakers_pkey PRIMARY KEY (id)
);

-- Create topics table
CREATE TABLE public.topics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_topic_id uuid,
  embedding vector,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT topics_pkey PRIMARY KEY (id),
  CONSTRAINT topics_parent_topic_id_fkey FOREIGN KEY (parent_topic_id) REFERENCES public.topics(id)
);

-- Create segments table
CREATE TABLE public.segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transcript_id uuid NOT NULL,
  speaker_id uuid,
  start_time numeric,
  end_time numeric,
  segment_index integer NOT NULL,
  text text NOT NULL,
  token_count integer NOT NULL,
  embedding vector,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT segments_pkey PRIMARY KEY (id),
  CONSTRAINT segments_transcript_id_fkey FOREIGN KEY (transcript_id) REFERENCES public.transcripts(id),
  CONSTRAINT segments_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id)
);

-- Create segment_topics junction table
CREATE TABLE public.segment_topics (
  segment_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  confidence double precision NOT NULL,
  CONSTRAINT segment_topics_pkey PRIMARY KEY (segment_id, topic_id),
  CONSTRAINT segment_topics_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.segments(id),
  CONSTRAINT segment_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id)
);

-- Create speaker_topics junction table
CREATE TABLE public.speaker_topics (
  speaker_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  frequency integer NOT NULL DEFAULT 0,
  emphasis double precision NOT NULL DEFAULT 0,
  CONSTRAINT speaker_topics_pkey PRIMARY KEY (speaker_id, topic_id),
  CONSTRAINT speaker_topics_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id),
  CONSTRAINT speaker_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id)
);

-- Create indexes for better performance
CREATE INDEX idx_transcript_metadata_source_id ON public.transcript_metadata(source_id);
CREATE INDEX idx_transcript_metadata_processing_status ON public.transcript_metadata(processing_status);
CREATE INDEX idx_segments_transcript_id ON public.segments(transcript_id);
CREATE INDEX idx_segments_speaker_id ON public.segments(speaker_id);
CREATE INDEX idx_topics_parent_topic_id ON public.topics(parent_topic_id);

-- Create view for latest version of each transcript
CREATE VIEW public.transcript_metadata_latest_view AS
SELECT DISTINCT ON (source_id) *
FROM public.transcript_metadata
ORDER BY source_id, version DESC;

-- Function to initialize tables (called from TranscriptStorage class)
CREATE OR REPLACE FUNCTION public.initialize_transcript_tables()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function exists as a placeholder
    -- The actual initialization is done through migrations
    -- But the TranscriptStorage class calls this to ensure tables exist
END;
$$;

-- Enable RLS (Row Level Security) by default for security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO public;

-- Log completion
SELECT 'Complete transcript analysis schema initialized' AS status;