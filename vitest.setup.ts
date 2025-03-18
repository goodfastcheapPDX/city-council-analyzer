// vitest.setup.ts
import { beforeAll, afterAll, vi } from 'vitest';

// Set up fetch polyfill
if (!global.fetch) {
    global.fetch = vi.fn();
    global.Headers = vi.fn().mockImplementation(() => ({}));
    global.Request = vi.fn();
    global.Response = vi.fn();
}