// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock the fetch API
global.fetch = jest.fn();

// Mock the Vercel Blob Storage API
jest.mock('@vercel/blob', () => ({
    put: jest.fn().mockResolvedValue({ url: 'https://test-url.com/file' }),
    del: jest.fn().mockResolvedValue({}),
    list: jest.fn().mockResolvedValue({
        blobs: [],
        cursor: null,
        hasMore: false,
    }),
    head: jest.fn().mockResolvedValue({
        url: 'https://test-url.com/file',
        metadata: {},
    }),
}));

// Mock environment variables
process.env = {
    ...process.env,
    ENABLE_PROCESSING: 'true',
    ENABLE_CACHING: 'true',
    DEBUG_MODE: 'false',
};

// Reset mocks before each test
beforeEach(() => {
    jest.resetAllMocks();
    global.fetch.mockClear();
});

// Cleanup after each test
afterEach(() => {
    // Add any cleanup code here
});