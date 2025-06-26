import { TranscriptStorage } from '../blob';

/**
 * Create storage client for test environment
 * Uses dynamic import to avoid static analysis issues
 */
export async function createStorageForTest(pathPrefix?: string): Promise<TranscriptStorage> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing test DB environment variables');
  }

  if (!supabaseUrl.includes('test')) {
    console.warn(`⚠️ Not using isolated test DB: ${supabaseUrl}`);
  }

  // Dynamic import to avoid static analysis
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  return new TranscriptStorage(supabaseClient, pathPrefix ?? 'test-transcripts');
}

/**
 * Synchronous version using require() for environments that support it
 */
export function createStorageForTestSync(pathPrefix?: string): TranscriptStorage {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing test DB environment variables');
  }

  // Use require to avoid static analysis
  const { createClient } = require('@supabase/supabase-js');
  const supabaseClient = createClient(supabaseUrl, supabaseKey);
  return new TranscriptStorage(supabaseClient, pathPrefix ?? 'test-transcripts');
}