// vitest.setup.ts
import { beforeAll, afterAll, vi } from 'vitest';

// Set up fetch polyfill
if (!global.fetch) {
    global.fetch = vi.fn();
    global.Headers = vi.fn().mockImplementation(() => ({}));
    global.Request = vi.fn();
    global.Response = vi.fn();
}

// Don't show console messages during tests unless there's an error
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;

if (process.env.DEBUG !== 'true') {
    console.log = vi.fn();
    console.info = vi.fn();
}

// Cleanup function that runs after all tests
afterAll(() => {
    // Restore original console functions
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
});