create extension if not exists "pgjwt" with schema "extensions";


alter table "public"."segment_topics" drop constraint "segment_topics_segment_id_fkey";

alter table "public"."segment_topics" drop constraint "segment_topics_topic_id_fkey";

alter table "public"."segments" drop constraint "segments_transcript_id_fkey";

alter table "public"."speaker_topics" drop constraint "speaker_topics_speaker_id_fkey";

alter table "public"."speaker_topics" drop constraint "speaker_topics_topic_id_fkey";

drop index if exists "public"."idx_segments_speaker_id";

drop index if exists "public"."idx_segments_transcript_id";

drop index if exists "public"."idx_topics_parent_topic_id";

drop index if exists "public"."idx_transcript_metadata_processing_status";

drop index if exists "public"."idx_transcript_metadata_source_id";

alter table "public"."segments" alter column "embedding" set data type vector(1536) using "embedding"::vector(1536);

alter table "public"."speakers" alter column "embedding" set data type vector(1536) using "embedding"::vector(1536);

alter table "public"."topics" alter column "embedding" set data type vector(1536) using "embedding"::vector(1536);

CREATE INDEX segments_embedding_idx ON public.segments USING ivfflat (embedding vector_cosine_ops) WITH (lists='100');

CREATE INDEX segments_speaker_id_idx ON public.segments USING btree (speaker_id);

CREATE INDEX segments_start_time_idx ON public.segments USING btree (start_time);

CREATE INDEX segments_transcript_id_idx ON public.segments USING btree (transcript_id);

CREATE INDEX transcript_metadata_processing_status_idx ON public.transcript_metadata USING btree (processing_status);

CREATE INDEX transcript_metadata_source_id_idx ON public.transcript_metadata USING btree (source_id);

CREATE UNIQUE INDEX transcript_metadata_source_id_version_key ON public.transcript_metadata USING btree (source_id, version);

CREATE INDEX transcript_metadata_speakers_idx ON public.transcript_metadata USING gin (speakers);

CREATE INDEX transcript_metadata_tags_idx ON public.transcript_metadata USING gin (tags);

CREATE INDEX transcript_metadata_ts_title_idx ON public.transcript_metadata USING gin (ts_title);

CREATE INDEX transcript_metadata_uploaded_at_idx ON public.transcript_metadata USING btree (uploaded_at DESC);

CREATE INDEX transcripts_date_idx ON public.transcripts USING btree (date);

alter table "public"."transcript_metadata" add constraint "transcript_metadata_source_id_version_key" UNIQUE using index "transcript_metadata_source_id_version_key";

alter table "public"."segment_topics" add constraint "segment_topics_segment_id_fkey" FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE CASCADE not valid;

alter table "public"."segment_topics" validate constraint "segment_topics_segment_id_fkey";

alter table "public"."segment_topics" add constraint "segment_topics_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE not valid;

alter table "public"."segment_topics" validate constraint "segment_topics_topic_id_fkey";

alter table "public"."segments" add constraint "segments_transcript_id_fkey" FOREIGN KEY (transcript_id) REFERENCES transcripts(id) ON DELETE CASCADE not valid;

alter table "public"."segments" validate constraint "segments_transcript_id_fkey";

alter table "public"."speaker_topics" add constraint "speaker_topics_speaker_id_fkey" FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE CASCADE not valid;

alter table "public"."speaker_topics" validate constraint "speaker_topics_speaker_id_fkey";

alter table "public"."speaker_topics" add constraint "speaker_topics_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE not valid;

alter table "public"."speaker_topics" validate constraint "speaker_topics_topic_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.match_segments(query_embedding vector, match_threshold double precision, match_count integer, filter_transcript_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, transcript_id uuid, speaker_id uuid, text text, similarity double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    segments.id,
    segments.transcript_id,
    segments.speaker_id,
    segments.text,
    1 - (segments.embedding <=> query_embedding) AS similarity
  FROM segments
  WHERE
    (filter_transcript_id IS NULL OR transcript_id = filter_transcript_id)
    AND 1 - (segments.embedding <=> query_embedding) > match_threshold
  ORDER BY segments.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.initialize_transcript_tables()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- This function exists as a placeholder
    -- The actual initialization is done through migrations
    -- But the TranscriptStorage class calls this to ensure tables exist
END;
$function$
;

CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON public.segments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON public.speakers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON public.transcripts FOR EACH ROW EXECUTE FUNCTION update_updated_at();


