/**
 * Application configuration
 */

import { DateTime } from 'luxon';

/**
 * Branded types for type-safe date handling
 */
export type DatabaseDateString = string & { readonly __brand: 'DatabaseDate' };
export type UserInputDateString = string & { readonly __brand: 'UserInputDate' };
export type DisplayDateString = string & { readonly __brand: 'DisplayDate' };

/**
 * Date and time formatting standards for the entire application
 * SINGLE SOURCE OF TRUTH for all date handling
 */
export const dateFormats = {
    /**
     * Database storage format: ISO 8601 with timezone
     * PostgreSQL/Supabase returns: "2024-01-15T10:30:00.000+00:00"
     * Our dateUtils normalize to: "2024-01-15T10:30:00.000Z" (UTC)
     * Both formats are equivalent and valid ISO 8601
     */
    database: 'YYYY-MM-DDTHH:mm:ss.sss[Z|±HH:mm]',   
    
    /**
     * User input format: Simple date for forms and API input
     * Example: "2024-01-15"
     */
    userInput: 'YYYY-MM-DD',
    
    /**
     * API response format: ISO 8601 UTC (normalized by dateUtils)
     * Example: "2024-01-15T10:30:00.000Z"
     */
    apiResponse: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    
    /**
     * Display format: Human-readable format for UI
     * Example: "January 15, 2024"
     */
    display: 'MMMM DD, YYYY'
} as const;

/**
 * Date utility functions for consistent formatting across the application
 * 
 * NOTE: All functions normalize dates to UTC format (ending in Z) for consistency,
 * even though PostgreSQL may return dates with explicit timezone offsets (+00:00).
 * Both formats represent the same time and are valid ISO 8601.
 */
export const dateUtils = {
    /**
     * Convert user input date (YYYY-MM-DD) to database format
     * @param userDate - Date in YYYY-MM-DD format
     * @returns ISO string for database storage
     */
    userInputToDatabase(userDate: string): string {
        // Parse the simple date and convert to ISO string
        // Note: This assumes UTC timezone for simple dates
        const parsed = DateTime.fromISO(userDate, { zone: 'utc' }).startOf('day');
        if (!parsed.isValid) {
            throw new Error(`Invalid user input date: ${userDate}. Expected format: YYYY-MM-DD`);
        }
        const result = parsed.toISO();
        if (!result) {
            throw new Error(`Failed to convert date to ISO format: ${userDate}`);
        }
        return result;
    },
    
    /**
     * Get current timestamp in database format
     * @returns Current time as ISO string
     */
    now(): string {
        const result = DateTime.now().toUTC().toISO();
        if (!result) {
            throw new Error('Failed to generate current timestamp');
        }
        return result;
    },
    
    /**
     * Convert database format to user input format
     * @param dbDate - Date from database (ISO string)
     * @returns Simple date string (YYYY-MM-DD)
     */
    databaseToUserInput(dbDate: string): string {
        const parsed = DateTime.fromISO(dbDate).toUTC();
        if (!parsed.isValid) {
            throw new Error(`Invalid database date format: ${dbDate}. Expected ISO 8601 format`);
        }
        const result = parsed.toISODate();
        if (!result) {
            throw new Error(`Failed to convert database date to user format: ${dbDate}`);
        }
        return result;
    },
    
    /**
     * Validate user input date format
     * @param dateString - Date string to validate
     * @returns True if valid YYYY-MM-DD format
     */
    isValidUserInput(dateString: string): boolean {
        const pattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!pattern.test(dateString)) {
            return false;
        }
        
        const parsed = DateTime.fromISO(dateString, { zone: 'utc' });
        return parsed.isValid && parsed.toISODate() === dateString;
    },
    
    /**
     * Parse any date input and return database format
     * @param input - Date string, Date object, or DateTime object
     * @returns ISO string for database storage
     */
    toDatabase(input: string | Date | DateTime): string {
        if (input instanceof Date) {
            const converted = DateTime.fromJSDate(input).toUTC();
            if (!converted.isValid) {
                throw new Error(`Invalid Date object provided: ${input}`);
            }
            const result = converted.toISO();
            if (!result) {
                throw new Error(`Failed to convert Date object to ISO format: ${input}`);
            }
            return result;
        }
        
        if (input instanceof DateTime) {
            const converted = input.toUTC();
            if (!converted.isValid) {
                throw new Error(`Invalid DateTime object provided: ${input}`);
            }
            const result = converted.toISO();
            if (!result) {
                throw new Error(`Failed to convert DateTime object to ISO format: ${input}`);
            }
            return result;
        }
        
        // If it's already in database format, return as-is after validation
        if (input.includes('T')) {
            const parsed = DateTime.fromISO(input).toUTC();
            if (!parsed.isValid) {
                throw new Error(`Invalid ISO date string: ${input}`);
            }
            const result = parsed.toISO();
            if (!result) {
                throw new Error(`Failed to convert ISO date string: ${input}`);
            }
            return result;
        }
        
        // Assume it's user input format
        return this.userInputToDatabase(input);
    },

    /**
     * Generate deterministic test date for reliable testing
     * @param isoString - ISO date string for testing
     * @returns ISO string in database format
     */
    testDate(isoString: string): string {
        const parsed = DateTime.fromISO(isoString, { zone: 'utc' });
        if (!parsed.isValid) {
            throw new Error(`Invalid test date: ${isoString}. Expected ISO 8601 format`);
        }
        const result = parsed.toISO();
        if (!result) {
            throw new Error(`Failed to convert test date to ISO format: ${isoString}`);
        }
        return result;
    },

    /**
     * Convert date to different timezone
     * @param date - ISO date string
     * @param targetZone - Target timezone (e.g., 'America/New_York')
     * @returns ISO string in target timezone
     */
    convertTimezone(date: string, targetZone: string): string {
        const parsed = DateTime.fromISO(date);
        if (!parsed.isValid) {
            throw new Error(`Invalid date for timezone conversion: ${date}`);
        }
        const converted = parsed.setZone(targetZone);
        if (!converted.isValid) {
            throw new Error(`Invalid timezone: ${targetZone}`);
        }
        const result = converted.toISO();
        if (!result) {
            throw new Error(`Failed to convert date to timezone ${targetZone}: ${date}`);
        }
        return result;
    },

    /**
     * Check if first date is before second date
     * @param date1 - First date (ISO string)
     * @param date2 - Second date (ISO string)
     * @returns True if date1 is before date2
     */
    isBefore(date1: string, date2: string): boolean {
        const parsed1 = DateTime.fromISO(date1);
        const parsed2 = DateTime.fromISO(date2);
        if (!parsed1.isValid) {
            throw new Error(`Invalid first date for comparison: ${date1}`);
        }
        if (!parsed2.isValid) {
            throw new Error(`Invalid second date for comparison: ${date2}`);
        }
        return parsed1 < parsed2;
    },

    /**
     * Check if first date is after second date
     * @param date1 - First date (ISO string)
     * @param date2 - Second date (ISO string)
     * @returns True if date1 is after date2
     */
    isAfter(date1: string, date2: string): boolean {
        const parsed1 = DateTime.fromISO(date1);
        const parsed2 = DateTime.fromISO(date2);
        if (!parsed1.isValid) {
            throw new Error(`Invalid first date for comparison: ${date1}`);
        }
        if (!parsed2.isValid) {
            throw new Error(`Invalid second date for comparison: ${date2}`);
        }
        return parsed1 > parsed2;
    },

    /**
     * Format date for user display (human-readable)
     * @param date - ISO date string
     * @returns Formatted date string (e.g., "January 15, 2024")
     */
    toUserDisplay(date: string): string {
        const parsed = DateTime.fromISO(date);
        if (!parsed.isValid) {
            throw new Error(`Invalid date for display formatting: ${date}`);
        }
        return parsed.toLocaleString(DateTime.DATE_FULL);
    }
} as const;

/**
 * Type-safe date utilities with branded types for compile-time safety
 */
export const typedDateUtils = {
    /**
     * Convert to database format with type safety
     * @param date - Date string or Date object
     * @returns Type-safe database date string
     */
    toDatabaseFormat(date: string | Date): DatabaseDateString {
        return dateUtils.toDatabase(date) as DatabaseDateString;
    },

    /**
     * Convert user input to database format with type safety
     * @param userDate - User input date string
     * @returns Type-safe database date string
     */
    fromUserInput(userDate: UserInputDateString): DatabaseDateString {
        return dateUtils.userInputToDatabase(userDate) as DatabaseDateString;
    },

    /**
     * Convert database date to user input format with type safety
     * @param dbDate - Database date string
     * @returns Type-safe user input date string
     */
    toUserInput(dbDate: DatabaseDateString): UserInputDateString {
        return dateUtils.databaseToUserInput(dbDate) as UserInputDateString;
    },

    /**
     * Convert database date to display format with type safety
     * @param dbDate - Database date string
     * @returns Type-safe display date string
     */
    toDisplay(dbDate: DatabaseDateString): DisplayDateString {
        return dateUtils.toUserDisplay(dbDate) as DisplayDateString;
    },

    /**
     * Generate current timestamp with type safety
     * @returns Type-safe database date string
     */
    now(): DatabaseDateString {
        return dateUtils.now() as DatabaseDateString;
    },

    /**
     * Generate test date with type safety
     * @param isoString - ISO date string for testing
     * @returns Type-safe database date string
     */
    testDate(isoString: string): DatabaseDateString {
        return dateUtils.testDate(isoString) as DatabaseDateString;
    }
} as const;

export const config = {
    // Supabase configuration
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },

    // Storage configuration (Supabase Storage)
    storage: {
        bucketName: 'transcripts',
        maxFileSize: 50 * 1024 * 1024, // 50MB to match bucket configuration
        allowedMimeTypes: [
            'application/json',
            'text/plain',
            'text/srt',
            'text/vtt',
            'application/octet-stream'
        ],
        // Public access setting depends on environment
        publicAccess: process.env.NODE_ENV === 'development',
    },

    // Legacy blob storage configuration (for migration reference)
    blob: {
        /**
         * Path prefix for transcript blobs
         * This allows for organizing blobs by type
         */
        transcriptPathPrefix: 'transcripts',

        /**
         * Maximum allowed transcript size in bytes
         * Default: 10MB (legacy - now 50MB in Supabase)
         */
        maxTranscriptSize: 10 * 1024 * 1024,

        /**
         * How long to store transcripts for
         * Default: 30 days (for development)
         * In production, you might set this to a longer period
         */
        expirationSeconds: 30 * 24 * 60 * 60,

        /**
         * Whether to allow public access to transcript blobs
         * Default: false (private access only)
         */
        allowPublicAccess: false,
    },

    // Processing configuration
    processing: {
        /**
         * Maximum segment size in tokens
         * This ensures segments fit within LLM context windows
         */
        maxSegmentTokens: 4000,

        /**
         * Overlap between segments in tokens
         * This provides context continuity between segments
         */
        segmentOverlapTokens: 200,

        /**
         * Whether to enable speaker-based segmentation
         * This splits segments at speaker boundaries when possible
         */
        enableSpeakerSegmentation: true,

        /**
         * Whether to enable semantic segmentation
         * This tries to split at topic boundaries
         */
        enableSemanticSegmentation: true,
    }
};

// .env.example file
/*
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your_project_ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Legacy Vercel Blob Storage (for migration)
BLOB_READ_WRITE_TOKEN=your_blob_read_write_token

# API Keys
OPENAI_API_KEY=your_openai_api_key

# Storage Configuration
STORAGE_BUCKET_NAME=transcripts
STORAGE_MAX_FILE_SIZE=52428800

# Feature Flags
ENABLE_PROCESSING=true
ENABLE_CACHING=true
*/

// next.config.js
/**
 * @type {import('next').NextConfig}
 */
module.exports = {
    // Additional configuration for the Next.js application
    env: {
        // Make config available on the client side if needed
        ENABLE_PROCESSING: process.env.ENABLE_PROCESSING,
        ENABLE_CACHING: process.env.ENABLE_CACHING,
    },
};

// Instructions for deployment

/*
1. Install Vercel CLI: npm i -g vercel
2. Log in: vercel login
3. Initialize the project: vercel
4. Set up environment variables:
   - On local development:
     - Create a .env.local file based on .env.example
     - Run vercel env pull to get environment variables
   - On Vercel dashboard:
     - Go to your project
     - Navigate to Settings > Environment Variables
     - Add the required variables

5. Enable Vercel Blob Storage:
   - Go to your project on Vercel dashboard
   - Navigate to Storage > Blob
   - Enable Blob Storage
   - Copy the BLOB_READ_WRITE_TOKEN to your environment variables

6. Deploy the application: vercel --prod

7. Configure the database schema using Supabase:
   - Go to your Supabase project
   - Navigate to SQL Editor
   - Run the database schema creation scripts

8. Configure CORS for Blob Storage:
   - Go to your project on Vercel dashboard
   - Navigate to Settings > Domains
   - Add your domains to the allowed origins
*/