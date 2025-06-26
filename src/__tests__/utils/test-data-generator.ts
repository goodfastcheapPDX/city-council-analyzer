import { faker } from '@faker-js/faker';
import { dateUtils } from '@/lib/config';
import { TranscriptMetadata } from '@/lib/storage/blob';
import { DateTime } from 'luxon';

// Set a fixed seed for deterministic test data generation
faker.seed(12345);

/**
 * Configuration options for generating transcript test data
 * Uses the same TranscriptMetadata interface as the main application
 */
interface TranscriptDataOptions extends Partial<Omit<TranscriptMetadata, 'uploadedAt' | 'version'>> {
  speakerCount?: number;
  content?: string;
  contentLength?: number;
}

/**
 * Configuration options for generating speaker test data
 */
interface SpeakerDataOptions {
  name?: string;
  role?: string;
  count?: number;
}

/**
 * Generated transcript test data structure
 */
interface GeneratedTranscriptData {
  metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'>;
  content: string;
}

/**
 * Generate deterministic speaker names for testing
 * Uses a fixed pool of names to ensure reproducible tests
 */
function generateSpeakerNames(count: number, customNames?: string[]): string[] {
  if (customNames && customNames.length >= count) {
    return customNames.slice(0, count);
  }

  const speakerPool = [
    'Mayor Johnson',
    'Council Member Smith',
    'Council Member Davis',
    'Council Member Wilson',
    'Council Member Brown',
    'Council Member Taylor',
    'City Attorney Martinez',
    'City Manager Anderson',
    'Finance Director Thompson',
    'Planning Director Garcia'
  ];

  const speakers: string[] = [];
  for (let i = 0; i < count; i++) {
    if (customNames && customNames[i]) {
      speakers.push(customNames[i]);
    } else {
      speakers.push(speakerPool[i % speakerPool.length]);
    }
  }

  return speakers;
}

/**
 * Generate a deterministic date string for testing
 * Uses dateUtils to ensure consistency with project standards
 */
function generateTestDate(customDate?: string): string {
  if (customDate) {
    // Validate and standardize the provided date
    if (dateUtils.isValidUserInput(customDate)) {
      return customDate;
    }
    throw new Error(`Invalid date format provided: ${customDate}. Expected YYYY-MM-DD format.`);
  }

  // Generate a deterministic date using dateUtils and faker
  // Create a base date and add random days to it for variation
  const baseDateStr = '2024-01-01T00:00:00.000Z';
  const baseDate = dateUtils.testDate(baseDateStr);
  const randomDays = faker.number.int({ min: 0, max: 365 }); // Within a year
  
  const generatedDate = dateUtils.addDays(baseDate, randomDays);
  return dateUtils.databaseToUserInput(generatedDate);
}

/**
 * Generate transcript content based on speaker count and desired length
 */
function generateTranscriptContent(speakers: string[], contentLength?: number): string {
  const targetLength = contentLength || faker.number.int({ min: 100, max: 1000 });
  
  let content = '';
  let currentLength = 0;
  let speakerIndex = 0;

  while (currentLength < targetLength) {
    const speaker = speakers[speakerIndex % speakers.length];
    const statement = faker.lorem.sentences(faker.number.int({ min: 1, max: 3 }));
    const line = `${speaker}: ${statement}\n`;
    
    content += line;
    currentLength += line.length;
    speakerIndex++;
  }

  return content.trim();
}

/**
 * Generate a unique source ID for testing
 * Uses deterministic generation to avoid collisions while remaining predictable
 */
function generateSourceId(customSourceId?: string): string {
  if (customSourceId) {
    return customSourceId;
  }

  // Generate a deterministic but unique sourceId using faker
  // Avoid Date.now() to prevent test drift
  const prefix = 'test-transcript';
  const uniqueId = faker.string.alphanumeric(8);
  const numericSuffix = faker.number.int({ min: 1000, max: 9999 });
  
  return `${prefix}-${uniqueId}-${numericSuffix}`;
}

/**
 * Generate comprehensive test data for a transcript with optional overrides
 * 
 * @param options Configuration options to override default generated values
 * @returns Generated transcript data with metadata and content
 * 
 * @example
 * // Generate basic transcript data
 * const basicData = generateTranscriptData();
 * 
 * @example
 * // Generate transcript with specific speaker count
 * const multiSpeakerData = generateTranscriptData({ speakerCount: 5 });
 * 
 * @example
 * // Generate transcript with custom title and date
 * const customData = generateTranscriptData({
 *   title: 'Special Council Meeting',
 *   date: '2024-03-15'
 * });
 */
export function generateTranscriptData(options: TranscriptDataOptions = {}): GeneratedTranscriptData {
  // Generate or use provided source ID
  const sourceId = generateSourceId(options.sourceId);
  
  // Generate speakers
  const speakerCount = options.speakerCount || faker.number.int({ min: 2, max: 6 });
  const speakers = options.speakers || generateSpeakerNames(speakerCount);
  
  // Generate or use provided date
  const date = generateTestDate(options.date);
  
  // Generate content
  const content = options.content || generateTranscriptContent(speakers, options.contentLength);
  
  // Build metadata using the actual TranscriptMetadata interface
  const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
    sourceId,
    title: options.title || `${faker.company.name()} Council Meeting`,
    date,
    speakers,
    format: options.format || faker.helpers.arrayElement(['json', 'text', 'srt', 'vtt']),
    processingStatus: options.processingStatus || 'pending',
    processingCompletedAt: options.processingCompletedAt || null,
    tags: options.tags || faker.helpers.arrayElements(['meeting', 'council', 'public', 'governance'], { min: 1, max: 3 })
  };

  return {
    metadata,
    content
  };
}

/**
 * Generate multiple transcript data entries for batch testing
 * 
 * @param count Number of transcripts to generate
 * @param baseOptions Base options applied to all generated transcripts
 * @returns Array of generated transcript data
 * 
 * @example
 * // Generate 5 transcripts with consistent format
 * const batchData = generateTranscriptDataBatch(5, { format: 'json' });
 */
export function generateTranscriptDataBatch(
  count: number, 
  baseOptions: TranscriptDataOptions = {}
): GeneratedTranscriptData[] {
  const transcripts: GeneratedTranscriptData[] = [];
  
  for (let i = 0; i < count; i++) {
    // Create unique options for each transcript while preserving base options
    const transcriptOptions = {
      ...baseOptions,
      sourceId: baseOptions.sourceId ? `${baseOptions.sourceId}-${i + 1}` : undefined
    };
    
    transcripts.push(generateTranscriptData(transcriptOptions));
  }
  
  return transcripts;
}

/**
 * Generate speaker data for testing speaker-related functionality
 * 
 * @param options Configuration options for speaker generation
 * @returns Generated speaker data
 * 
 * @example
 * // Generate speaker with specific role
 * const mayor = generateSpeakerData({ role: 'Mayor' });
 */
export function generateSpeakerData(options: SpeakerDataOptions = {}) {
  return {
    name: options.name || faker.person.fullName(),
    role: options.role || faker.helpers.arrayElement([
      'Mayor',
      'Council Member', 
      'City Attorney',
      'City Manager',
      'Department Director',
      'Public Speaker'
    ])
  };
}

/**
 * Generate test dates for specific scenarios
 * All dates use dateUtils for consistency with project standards
 * Relative to dateUtils.now() to maintain semantic meaning over time
 */
export const testDates = {
  /** Get a recent date (30 days ago from now) */
  recent: () => {
    const recentDate = dateUtils.addDays(dateUtils.now(), -30);
    return generateTestDate(dateUtils.databaseToUserInput(recentDate));
  },
  
  /** Get an older date (2 years ago from now) */
  old: () => {
    const oldDate = dateUtils.addDays(dateUtils.now(), -730); // 2 years ago
    return generateTestDate(dateUtils.databaseToUserInput(oldDate));
  },
  
  /** Get a future date (2 years ahead from now for testing validation) */
  future: () => {
    const futureDate = dateUtils.addDays(dateUtils.now(), 730); // 2 years ahead
    return generateTestDate(dateUtils.databaseToUserInput(futureDate));
  },
  
  /** Get today's date in standard format */
  today: () => generateTestDate(dateUtils.databaseToUserInput(dateUtils.now())),
  
  /** Generate a deterministic date for consistent tests */
  deterministic: () => generateTestDate('2024-01-15')
};

/**
 * Common test scenarios for transcript data generation
 */
export const testScenarios = {
  /** Minimal transcript with required fields only */
  minimal: () => generateTranscriptData({
    speakerCount: 1,
    contentLength: 50,
    tags: ['test']
  }),
  
  /** Large transcript with many speakers and content */
  large: () => generateTranscriptData({
    speakerCount: 8,
    contentLength: 2000,
    tags: ['meeting', 'public', 'council', 'governance', 'budget']
  }),
  
  /** Processed transcript ready for analysis */
  processed: () => generateTranscriptData({
    processingStatus: 'processed',
    format: 'json'
  }),
  
  /** Failed processing transcript for error testing */
  failed: () => generateTranscriptData({
    processingStatus: 'failed',
    format: 'text'
  })
};