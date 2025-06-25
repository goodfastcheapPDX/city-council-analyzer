UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'text/json',                    
  'application/json',             
  'text/script',                  
  'text/plain',                   
  'text/srt',                     
  'text/vtt',                      
  'application/octet-stream',      
  'text/x-subrip',               
  'text/vnd.web-video-text-tracks',
  '*'                           
]::text[]
WHERE id = 'transcripts';

SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'transcripts';