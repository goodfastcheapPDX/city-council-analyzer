import { TranscriptStorage } from './blob';

// Keep track of the current storage implementation
let currentStorage: any = null;
let isTestMode = false;

/**
 * Gets the transcript storage implementation
 * - Returns mock implementation in test mode
 * - Creates and returns real implementation otherwise
 */
export function getTranscriptStorage(): TranscriptStorage {
    // If we're in test mode and have a test instance, return it
    if (isTestMode && currentStorage) {
        return currentStorage;
    }

    // If we've already created a real instance, return it
    if (currentStorage && !isTestMode) {
        return currentStorage;
    }

    // Create a new real storage instance
    currentStorage = new TranscriptStorage(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    return currentStorage;
}

/**
 * For testing only - allows injecting a mock implementation
 * This function should only be called from test files
 */
export function __setTestStorage(mockStorage: any): void {
    currentStorage = mockStorage;
    isTestMode = true;
}

/**
 * Reset to use the real implementation
 * This function should be called after tests complete
 */
export function __resetStorage(): void {
    currentStorage = null;
    isTestMode = false;
}