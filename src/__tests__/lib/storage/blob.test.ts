import { describe, it, expect, beforeAll } from 'vitest';
import { TranscriptStorage } from '@/lib/storage/blob';
import createStorage from './createStorage';

describe.sequential('TranscriptStorage - Database Connection', () => {
  // Connection timeout
  const TIMEOUT = 10000;

  let storage: TranscriptStorage;

  beforeAll(() => {
    storage = createStorage().storage
  });

  it('should connect to the database and initialize tables', async () => {
    // This test verifies that:
    // 1. We can connect to the Supabase instance in Docker
    // 2. The required tables can be initialized

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

  it('should be able to perform a basic query', async () => {
    // This test verifies we can execute a simple query operation

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