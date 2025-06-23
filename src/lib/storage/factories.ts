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
 * Use this in test files - uses isolated test database
 */
export function createStorageForTest(pathPrefix?: string): TranscriptStorage {
    // Validate test environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            'Test database environment variables not found. ' +
            'Make sure .env.test is configured and vitest is loading it. ' +
            'Run "npm run test:setup" to create the test database.'
        );
    }
    
    // Verify we're using the test database (not production)
    if (!supabaseUrl.includes('znybssicqofaendbrnbt') && !supabaseUrl.includes('test')) {
        console.warn(
            '⚠️  Warning: Test storage may not be using isolated test database. ' +
            `Current URL: ${supabaseUrl}`
        );
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Use test-specific path prefix to further isolate test data
    const testPathPrefix = pathPrefix || 'test-transcripts';
    
    return new TranscriptStorage(supabaseClient, testPathPrefix);
}