import { TranscriptStorage } from '../blob';

/**
 * Create storage client for server-side operations (API routes, SSR)
 * Uses service key for full database access
 */
export function createStorageForServer(): TranscriptStorage {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing server environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }

  // Use require() to completely avoid static analysis pulling supabase-js
  const { createClient } = require('@supabase/supabase-js');
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  return new TranscriptStorage(supabaseClient);
}