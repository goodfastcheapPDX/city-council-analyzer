import { createClient } from '@supabase/supabase-js';
import { TranscriptStorage } from '../blob';

/**
 * Create storage client for client-side operations (browser, components)
 * Uses anon key with RLS policies
 */
export function createStorageForClient(): TranscriptStorage {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing client environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return new TranscriptStorage(supabaseClient);
}