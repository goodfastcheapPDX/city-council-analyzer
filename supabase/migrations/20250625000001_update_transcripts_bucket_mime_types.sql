UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/json',             
  'text/plain',                   
  'text/plain; charset=utf-8',    
  'text/plain; charset=UTF-8',  
  'text/srt',                     
  'text/vtt',                     
  'application/octet-stream',   
  'text/x-subrip',               
  'text/vnd.web-video-text-tracks'
]::text[]
WHERE id = 'transcripts';

SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'transcripts';