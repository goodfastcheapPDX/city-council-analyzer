// types/supabase-test-types.ts
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { vi } from 'vitest';

/**
 * Helper function to create a properly typed Supabase client mock
 * This handles all the type compatibility issues
 */
export function createMockSupabaseClient(vitest: typeof vi): SupabaseClient {
    // Create a bare-bones mock with the methods we need
    const mockClient = {
        // Core methods we use in our tests
        rpc: vitest.fn().mockResolvedValue({
            data: null,
            error: null,
            count: null,
            status: 200,
            statusText: 'OK'
        }),

        from: vitest.fn().mockReturnValue({
            select: vitest.fn().mockReturnValue({
                eq: vitest.fn().mockReturnValue({
                    order: vitest.fn().mockReturnValue({
                        limit: vitest.fn().mockResolvedValue({
                            data: [],
                            error: null
                        })
                    })
                })
            }),
            insert: vitest.fn().mockResolvedValue({
                data: null,
                error: null
            }),
            update: vitest.fn().mockReturnValue({
                eq: vitest.fn().mockReturnValue({
                    eq: vitest.fn().mockResolvedValue({
                        data: null,
                        error: null
                    })
                })
            }),
            delete: vitest.fn().mockReturnValue({
                eq: vitest.fn().mockReturnValue({
                    eq: vitest.fn().mockResolvedValue({
                        data: null,
                        error: null
                    })
                })
            })
        })
    };

    // Use type assertion to bypass TypeScript's type checking for the mock
    // This is acceptable in testing code where we're only using specific methods
    return mockClient as unknown as SupabaseClient;
}