import { TranscriptStorage } from '../../../lib/storage/blob';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default () => {
    // Create a TranscriptStorage instance with environment variables
    // These would typically be set in your .env.test file pointing to your Docker container
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    console.log(supabaseKey, supabaseUrl)
    return {
        storage: new TranscriptStorage(supabaseUrl, supabaseKey, 'test-transcripts'),
        keys: [supabaseUrl, supabaseKey]
    }
}