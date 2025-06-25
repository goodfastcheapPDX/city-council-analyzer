import { describe, test, expect } from 'vitest';
import { 
  generateTranscriptData, 
  generateTranscriptDataBatch, 
  generateSpeakerData,
  testDates,
  testScenarios 
} from './test-data-generator';
import { dateUtils } from '@/lib/config';

describe('Test Data Generator', () => {
  describe('generateTranscriptData', () => {
    test('should generate valid transcript data with all required fields', () => {
      const data = generateTranscriptData();
      
      expect(data.metadata.sourceId).toBeTruthy();
      expect(data.metadata.title).toBeTruthy();
      expect(data.metadata.date).toBeTruthy();
      expect(data.metadata.speakers.length).toBeGreaterThan(0);
      expect(data.metadata.format).toMatch(/^(json|text|srt|vtt)$/);
      expect(data.metadata.processingStatus).toMatch(/^(pending|processed|failed)$/);
      expect(data.content).toBeTruthy();
      
      // Verify date is in correct format
      expect(dateUtils.isValidUserInput(data.metadata.date)).toBe(true);
    });

    test('should accept custom options and override defaults', () => {
      const customOptions = {
        title: 'Custom Meeting Title',
        speakerCount: 3,
        format: 'json' as const,
        processingStatus: 'processed' as const,
        date: '2024-03-15'
      };
      
      const data = generateTranscriptData(customOptions);
      
      expect(data.metadata.title).toBe(customOptions.title);
      expect(data.metadata.speakers).toHaveLength(3);
      expect(data.metadata.format).toBe(customOptions.format);
      expect(data.metadata.processingStatus).toBe(customOptions.processingStatus);
      expect(data.metadata.date).toBe(customOptions.date);
    });

    test('should use provided sourceId consistently', () => {
      const customSourceId = 'test-consistent-id';
      const data1 = generateTranscriptData({ sourceId: customSourceId });
      const data2 = generateTranscriptData({ sourceId: customSourceId });
      
      // Both should use the same sourceId when explicitly provided
      expect(data1.metadata.sourceId).toBe(customSourceId);
      expect(data2.metadata.sourceId).toBe(customSourceId);
      expect(data1.metadata.sourceId).toBe(data2.metadata.sourceId);
    });
  });

  describe('generateTranscriptDataBatch', () => {
    test('should generate multiple transcripts with consistent base options', () => {
      const count = 3;
      const baseOptions = { format: 'json' as const };
      
      const batch = generateTranscriptDataBatch(count, baseOptions);
      
      expect(batch).toHaveLength(count);
      batch.forEach(transcript => {
        expect(transcript.metadata.format).toBe('json');
        expect(transcript.metadata.sourceId).toBeTruthy();
      });
    });
  });

  describe('generateSpeakerData', () => {
    test('should generate valid speaker data', () => {
      const speaker = generateSpeakerData();
      
      expect(speaker.name).toBeTruthy();
      expect(speaker.role).toBeTruthy();
      expect(typeof speaker.name).toBe('string');
      expect(typeof speaker.role).toBe('string');
    });

    test('should accept custom speaker options', () => {
      const customSpeaker = generateSpeakerData({
        name: 'Jane Doe',
        role: 'Mayor'
      });
      
      expect(customSpeaker.name).toBe('Jane Doe');
      expect(customSpeaker.role).toBe('Mayor');
    });
  });

  describe('testDates', () => {
    test('should generate dates relative to now with proper distances', () => {
      const now = dateUtils.now();
      const recent = testDates.recent();
      const old = testDates.old();
      const future = testDates.future();
      const today = testDates.today();
      
      // Verify all dates are valid
      expect(dateUtils.isValidUserInput(recent)).toBe(true);
      expect(dateUtils.isValidUserInput(old)).toBe(true);
      expect(dateUtils.isValidUserInput(future)).toBe(true);
      expect(dateUtils.isValidUserInput(today)).toBe(true);
      
      // Convert to database format for comparison
      const nowDb = now;
      const recentDb = dateUtils.userInputToDatabase(recent);
      const oldDb = dateUtils.userInputToDatabase(old);
      const futureDb = dateUtils.userInputToDatabase(future);
      
      // Verify relative positions
      expect(dateUtils.isBefore(recentDb, nowDb)).toBe(true);
      expect(dateUtils.isBefore(oldDb, recentDb)).toBe(true);
      expect(dateUtils.isAfter(futureDb, nowDb)).toBe(true);
    });

    test('should generate deterministic date consistently', () => {
      const date1 = testDates.deterministic();
      const date2 = testDates.deterministic();
      
      expect(date1).toBe(date2);
      expect(date1).toBe('2024-01-15');
    });
  });

  describe('testScenarios', () => {
    test('should generate minimal transcript scenario', () => {
      const minimal = testScenarios.minimal();
      
      expect(minimal.metadata.speakers).toHaveLength(1);
      expect(minimal.content.length).toBeLessThan(100); // Should be short
      expect(minimal.metadata.tags).toContain('test');
    });

    test('should generate large transcript scenario', () => {
      const large = testScenarios.large();
      
      expect(large.metadata.speakers.length).toBeGreaterThanOrEqual(8);
      expect(large.content.length).toBeGreaterThan(1000); // Should be long
      expect(large.metadata.tags?.length).toBeGreaterThanOrEqual(4);
    });

    test('should generate processed transcript scenario', () => {
      const processed = testScenarios.processed();
      
      expect(processed.metadata.processingStatus).toBe('processed');
      expect(processed.metadata.format).toBe('json');
    });

    test('should generate failed transcript scenario', () => {
      const failed = testScenarios.failed();
      
      expect(failed.metadata.processingStatus).toBe('failed');
      expect(failed.metadata.format).toBe('text');
    });
  });
});