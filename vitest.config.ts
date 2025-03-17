import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            all: true,
            include: ['lib/**/*.ts'],
            exclude: ['lib/**/*.d.ts', '**/node_modules/**'],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
        setupFiles: ['./vitest.setup.ts'],
        testTimeout: 30000, // Allow enough time for Docker tests
    },
});