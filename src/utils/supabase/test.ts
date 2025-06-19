import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client for testing environments
 * This bypasses SSR functionality and creates a direct client
 */
export const createTestClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};