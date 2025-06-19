import { describe, it, expect, beforeAll } from 'vitest';
import { createStorageForTest } from '@/lib/storage/factories';
import { TranscriptStorage } from '@/lib/storage/blob';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

describe.sequential('TranscriptStorage - Database Connection', () => {
  // Connection timeout
  const TIMEOUT = 10000;

  let storage: TranscriptStorage;

  beforeAll(async () => {
    storage = createStorageForTest();
  });

  it('should establish Supabase connection and create required tables when database is initialized', async () => {
    // This test ensures that the foundational database connectivity works correctly,
    // which is essential for all storage operations. If database connection fails,
    // users cannot store or retrieve any transcripts, making the entire system
    // unusable and preventing any transcript analysis or management functionality.

    try {
      await storage.initializeDatabase();

      // If we reach here without an error, the connection worked
      expect(true).toBeTruthy();
    } catch (error) {
      console.error('Database connection error:', error);
      // Fail the test with helpful information
      expect(error).toBeFalsy();
    }
  }, TIMEOUT);

  it('should execute listTranscripts query successfully when database connection is active', async () => {
    // This test verifies that basic database operations work reliably, ensuring
    // that the system can perform essential data retrieval tasks. Query failures
    // would prevent users from browsing their transcript collections, searching
    // for specific transcripts, and accessing their stored content.

    try {
      // Try listing transcripts (even if none exist yet)
      const result = await storage.listTranscripts(1, 0);

      // We should get back a properly formatted result with items array and total count
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.items)).toBe(true);

      // The total should be a number (even if 0)
      expect(typeof result.total).toBe('number');
    } catch (error) {
      console.error('Query execution error:', error);
      // Fail the test with helpful information
      expect(error).toBeFalsy();
    }
  }, TIMEOUT);
});