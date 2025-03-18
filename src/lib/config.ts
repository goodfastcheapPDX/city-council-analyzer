/**
 * Application configuration
 */
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
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key

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