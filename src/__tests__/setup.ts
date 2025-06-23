/**
 * Global test setup file for isolated database testing
 */

import { beforeAll, beforeEach, afterEach } from 'vitest';
import { createStorageForTest } from '@/lib/storage/factories';

// Mock environment variables
process.env.ENABLE_PROCESSING = 'true';
process.env.CRON_SECRET = 'test-secret';

/**
 * Global test database cleanup utility
 * Clears all test data between test runs to ensure isolation
 */
export async function cleanupTestDatabase(): Promise<void> {
    try {
        const storage = createStorageForTest();
        
        // Get all transcripts in test database
        const { items } = await storage.listTranscripts(1000, 0); // Get up to 1000 items
        
        // Delete all transcripts to clean up
        const deletePromises = items.map(item => 
            storage.deleteAllVersions(item.metadata.sourceId)
        );
        
        await Promise.all(deletePromises);
        
        console.log(`🧹 Cleaned up ${items.length} test transcripts`);
    } catch (error) {
        // Don't fail tests if cleanup fails, but log the issue
        console.warn('⚠️  Test database cleanup failed:', error);
    }
}

/**
 * Verify test database connection and configuration
 */
export async function verifyTestDatabaseSetup(): Promise<void> {
    try {
        const storage = createStorageForTest();
        
        // Try a simple operation to verify connectivity
        await storage.listTranscripts(1, 0);
        
        console.log('✅ Test database connection verified');
    } catch (error) {
        console.error('❌ Test database setup verification failed:', error);
        
        // Check if it's a missing schema issue
        if (error instanceof Error && error.message.includes('does not exist')) {
            throw new Error(
                'Test database schema is not set up. ' +
                'Please apply the database schema manually through the Supabase dashboard at: ' +
                'https://supabase.com/dashboard/project/znybssicqofaendbrnbt/sql-editor ' +
                'Run the migration SQL from supabase/migrations/ directory.'
            );
        }
        
        throw new Error(
            'Test database is not properly configured. ' +
            'Run "npm run test:setup" to create the test database.'
        );
    }
}

// Global test hooks
beforeAll(async () => {
    // Verify test database is available before running any tests
    await verifyTestDatabaseSetup();
    
    // Do initial cleanup to start with clean database
    await cleanupTestDatabase();
});

// Note: We don't do beforeEach cleanup automatically because some tests
// set up data in beforeAll that should persist across multiple test cases.
// Individual test files can call cleanupTestDatabase() explicitly if needed.