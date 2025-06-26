import { TranscriptStorage } from '../blob';
import { createServerClient } from '@supabase/ssr';

/**
 * Create storage client for server-side operations (API routes, SSR)
 * Uses @supabase/ssr for proper server-side context handling
 */
export function createStorageForServer(): TranscriptStorage {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing server environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  }

  // Use @supabase/ssr for proper server-side Supabase client creation
  const supabaseClient = createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get: () => undefined,
      set: () => {},
      remove: () => {},
    },
  });
  
  return new TranscriptStorage(supabaseClient);
}