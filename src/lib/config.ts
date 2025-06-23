/**
 * Application configuration
 */

/**
 * Date and time formatting standards for the entire application
 * SINGLE SOURCE OF TRUTH for all date handling
 */
export const dateFormats = {
    /**
     * Database storage format: ISO 8601 with timezone
     * This is what PostgreSQL/Supabase stores and returns
     * Example: "2024-01-15T10:30:00.000Z"
     */
    database: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    
    /**
     * User input format: Simple date for forms and API input
     * Example: "2024-01-15"
     */
    userInput: 'YYYY-MM-DD',
    
    /**
     * API response format: ISO 8601 with timezone (same as database)
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
        return new Date(userDate + 'T00:00:00.000Z').toISOString();
    },
    
    /**
     * Get current timestamp in database format
     * @returns Current time as ISO string
     */
    now(): string {
        return new Date().toISOString();
    },
    
    /**
     * Convert database format to user input format
     * @param dbDate - Date from database (ISO string)
     * @returns Simple date string (YYYY-MM-DD)
     */
    databaseToUserInput(dbDate: string): string {
        return new Date(dbDate).toISOString().split('T')[0];
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
        
        const date = new Date(dateString + 'T00:00:00.000Z');
        return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
    },
    
    /**
     * Parse any date input and return database format
     * @param input - Date string or Date object
     * @returns ISO string for database storage
     */
    toDatabase(input: string | Date): string {
        if (input instanceof Date) {
            return input.toISOString();
        }
        
        // If it's already in database format, return as-is
        if (input.includes('T')) {
            return new Date(input).toISOString();
        }
        
        // Assume it's user input format
        return this.userInputToDatabase(input);
    }
} as const;

export const config = {
    // Blob storage configuration
    blob: {
        /**
         * Path prefix for transcript blobs
         * This allows for organizing blobs by type
         */
        transcriptPathPrefix: 'transcripts',

        /**
         * Maximum allowed transcript size in bytes
         * Default: 10MB
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
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_blob_read_write_token

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
OPENAI_API_KEY=your_openai_api_key

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