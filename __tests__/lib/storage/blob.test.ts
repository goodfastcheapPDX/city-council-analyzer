import { describe, it, expect, beforeAll } from 'vitest';
import { TranscriptStorage } from '../../../lib/storage/blob';
import dotenv from 'dotenv';

// Load environment variables from .env.test file
dotenv.config({ path: '.env.test' });

describe('TranscriptStorage - Database Connection', () => {
  // Connection timeout
  const TIMEOUT = 10000;

  let storage: TranscriptStorage;

  beforeAll(() => {
    // Create a TranscriptStorage instance with environment variables
    // These would typically be set in your .env.test file pointing to your Docker container
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:8000';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

    storage = new TranscriptStorage(supabaseUrl, supabaseKey, 'test-transcripts');
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