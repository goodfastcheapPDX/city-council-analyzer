import { TranscriptStorage } from './blob';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import { createClient } from '@supabase/supabase-js';

/**
 * Creates a TranscriptStorage instance for server-side operations
 * Use this in API routes and Server Components
 */
export async function createStorageForServer(pathPrefix?: string): Promise<TranscriptStorage> {
    const supabaseClient = await createServerClient();
    return new TranscriptStorage(supabaseClient, pathPrefix);
}

/**
 * Creates a TranscriptStorage instance for client-side operations
 * Use this in Client Components
 */
export function createStorageForClient(pathPrefix?: string): TranscriptStorage {
    const supabaseClient = createBrowserClient();
    return new TranscriptStorage(supabaseClient, pathPrefix);
}

/**
 * Creates a TranscriptStorage instance for test environments
 * Use this in test files - bypasses SSR and uses direct client
 */
export function createStorageForTest(pathPrefix?: string): TranscriptStorage {
    const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    return new TranscriptStorage(supabaseClient, pathPrefix);
}