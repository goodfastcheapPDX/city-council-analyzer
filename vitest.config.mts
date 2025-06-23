import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { loadEnv } from 'vite';

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        globals: true,
        environment: 'node',
        env: loadEnv('test', process.cwd(), ''),
        setupFiles: ['src/__tests__/setup.ts'],
        include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'], // Adjusted include pattern
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            all: true,
            include: ['src/lib/**/*.ts'],
            exclude: ['src/lib/**/*.d.ts', '**/node_modules/**'],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
        testTimeout: 30000, // Allow enough time for Docker tests
        fileParallelism: false, // Run test files sequentially
    },
});