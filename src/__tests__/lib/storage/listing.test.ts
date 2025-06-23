import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TranscriptStorage, TranscriptMetadata } from '@/lib/storage/blob';
import { createStorageForTest } from '@/lib/storage/factories';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// Test timeout for network operations
const TIMEOUT = 15000;

/**
 * Wait for a specific duration (helpful for testing eventual consistency)
 * @param ms Milliseconds to wait
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe.sequential('TranscriptStorage - Listing and Search Functionality', () => {
    let storage: TranscriptStorage;
    const testSourceIds: string[] = [];
    
    // Flag to prevent global cleanup from interfering with this test suite
    // This suite sets up shared test data that should persist across tests
    (globalThis as any).__skipGlobalCleanup = true;

    // Test data - create multiple transcripts with various properties
    const testTranscripts = [
        {
            sourceId: `list-test-a-${Date.now()}`,
            title: "Marketing Team Meeting",
            date: "2023-01-15",
            speakers: ["Alice", "Bob", "Charlie"],
            tags: ["marketing", "planning", "q1"],
            content: `{"meeting":"Marketing Q1 Planning"}`
        },
        {
            sourceId: `list-test-b-${Date.now()}`,
            title: "Engineering Team Standup",
            date: "2023-02-10",
            speakers: ["Dave", "Eve", "Frank"],
            tags: ["engineering", "standup", "sprint"],
            content: `{"meeting":"Engineering Daily Standup"}`
        },
        {
            sourceId: `list-test-c-${Date.now()}`,
            title: "Executive Board Meeting",
            date: "2023-03-05",
            speakers: ["Grace", "Heidi", "Ivan"],
            tags: ["executive", "board", "quarterly"],
            content: `{"meeting":"Q1 Executive Review"}`
        },
        {
            sourceId: `list-test-d-${Date.now()}`,
            title: "Marketing Campaign Review",
            date: "2023-04-20",
            speakers: ["Alice", "Jack", "Karen"],
            tags: ["marketing", "campaign", "review"],
            content: `{"meeting":"Spring Campaign Review"}`
        },
        {
            sourceId: `list-test-e-${Date.now()}`,
            title: "Engineering Architecture Discussion",
            date: "2023-05-12",
            speakers: ["Dave", "Liam", "Mia"],
            tags: ["engineering", "architecture", "planning"],
            content: `{"meeting":"System Architecture Review"}`
        }
    ];

    // Set up before tests
    beforeAll(async () => {

        // Create storage instance
        storage = createStorageForTest()

        // Initialize database
        await storage.initializeDatabase();

        // Clean up any existing test data first
        for (const transcript of testTranscripts) {
            try {
                await storage.deleteAllVersions(transcript.sourceId);
            } catch (error) {
                // Ignore cleanup errors - records may not exist
            }
        }

        // Also clean up any leftover test data from previous runs
        // Get all existing transcripts and delete any that look like test data
        const existingRecords = await storage.listTranscripts(100, 0);
        for (const record of existingRecords.items) {
            const sourceId = record.metadata.sourceId;
            // Delete records that look like test data
            if (sourceId.includes('list-test-') || 
                sourceId.includes('transcript_') ||
                sourceId.length < 10 || // Short random IDs
                sourceId.includes('=') || // Base64-like IDs
                (sourceId.includes('-') && sourceId.length > 30) || // UUID-like
                record.metadata.title.includes('Test') ||
                record.metadata.title.includes('test') ||
                record.metadata.title.length < 5 || // Very short titles like ':a'
                record.metadata.title.includes(':')) { // Strange titles with colons
                try {
                    await storage.deleteAllVersions(sourceId);
                } catch (error) {
                    console.warn(`Failed to cleanup ${sourceId}:`, error);
                }
            }
        }

        // Upload all test transcripts
        for (const transcript of testTranscripts) {
            const metadata: Omit<TranscriptMetadata, 'uploadedAt' | 'version'> = {
                sourceId: transcript.sourceId,
                title: transcript.title,
                date: transcript.date,
                speakers: transcript.speakers,
                format: "json",
                processingStatus: "processed",
                processingCompletedAt: new Date().toISOString(),
                tags: transcript.tags
            };

            await storage.uploadTranscript(transcript.content, metadata);

            // For the first two transcripts, also upload a second version
            if (transcript === testTranscripts[0] || transcript === testTranscripts[1]) {
                await storage.uploadTranscript(
                    `{"meeting":"Updated version of ${transcript.title}"}`,
                    {
                        sourceId: transcript.sourceId,
                        title: `${transcript.title} - Updated`,
                        date: transcript.date,
                        speakers: transcript.speakers,
                        format: "json",
                        processingStatus: "processed",
                        processingCompletedAt: new Date().toISOString(),
                        tags: transcript.tags
                    }
                );
            }

            // Track sourceId for cleanup
            testSourceIds.push(transcript.sourceId);
        }

        // Give some time for any eventual consistency in the database
        await sleep(1000);
    }, TIMEOUT * 2);

    // Clean up after tests
    afterAll(async () => {
        // Delete all test transcripts
        for (const sourceId of testSourceIds) {
            try {
                await storage.deleteAllVersions(sourceId);
            } catch (error) {
                console.warn(`Cleanup failed for ${sourceId}:`, error);
            }
        }
        
        // Reset the global cleanup flag
        (globalThis as any).__skipGlobalCleanup = false;
    }, TIMEOUT);

    it('should list all transcripts with correct pagination', async () => {
        // 1. Get first 2 transcripts
        const firstPage = await storage.listTranscripts(2, 0);

        // 2. Verify we got correct page size and structure
        expect(firstPage).toHaveProperty('items');
        expect(firstPage).toHaveProperty('total');
        expect(firstPage.items.length).toBe(2);
        expect(firstPage.total).toBeGreaterThanOrEqual(testTranscripts.length);

        // 3. Get second page of 2 transcripts
        const secondPage = await storage.listTranscripts(2, 2);

        // 4. Verify we got different transcripts
        expect(secondPage.items.length).toBe(2);
        expect(secondPage.items[0].blobKey).not.toBe(firstPage.items[0].blobKey);
        expect(secondPage.items[1].blobKey).not.toBe(firstPage.items[1].blobKey);

        // 5. Get third page
        const thirdPage = await storage.listTranscripts(2, 4);

        // 6. Verify this page might have at least one item
        expect(thirdPage.items.length).toBeGreaterThanOrEqual(1);

        // 7. Verify total count is consistent across pages
        expect(secondPage.total).toBe(firstPage.total);
        expect(thirdPage.total).toBe(firstPage.total);
    }, TIMEOUT);

    it('should only return the latest version of each transcript when listing all', async () => {
        // 1. Get all transcripts
        const allTranscripts = await storage.listTranscripts(20, 0);

        // 2. Find our test transcripts that have multiple versions
        const firstTestId = testTranscripts[0].sourceId;
        const secondTestId = testTranscripts[1].sourceId;

        // 3. Count how many times each sourceId appears
        const sourceIdCounts = allTranscripts.items.reduce((counts, transcript) => {
            const sourceId = transcript.metadata.sourceId;
            counts[sourceId] = (counts[sourceId] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        // 4. Verify each sourceId only appears once (latest version only)
        expect(sourceIdCounts[firstTestId]).toBe(1);
        expect(sourceIdCounts[secondTestId]).toBe(1);

        // 5. Verify we get the latest version (version 2)
        const firstTestItem = allTranscripts.items.find(
            item => item.metadata.sourceId === firstTestId
        );
        const secondTestItem = allTranscripts.items.find(
            item => item.metadata.sourceId === secondTestId
        );

        expect(firstTestItem?.metadata.version).toBe(2);
        expect(secondTestItem?.metadata.version).toBe(2);
    }, TIMEOUT);

    it('should search transcripts by title correctly', async () => {
        // 1. Search for marketing related transcripts
        const marketingResults = await storage.searchTranscripts({ title: 'Marketing' });

        // 2. Verify we got the correct transcripts (at least 2 of our test ones)
        expect(marketingResults.items.length).toBeGreaterThanOrEqual(2);

        // Count how many of our expected titles appear in the results
        const titles = marketingResults.items.map(item => item.metadata.title);
        const expectedTitles = [
            'Marketing Team Meeting - Updated', // The updated version
            'Marketing Campaign Review'
        ];

        let foundCount = 0;
        for (const expected of expectedTitles) {
            if (titles.some(title => title.includes(expected))) {
                foundCount++;
            }
        }

        // Verify we found at least our expected titles
        expect(foundCount).toBeGreaterThanOrEqual(2);

        // 3. Search for engineering related transcripts
        const engineeringResults = await storage.searchTranscripts({ title: 'Engineering' });

        // 4. Verify we got the correct transcripts
        expect(engineeringResults.items.length).toBeGreaterThanOrEqual(2);

        // 5. Search for a non-existent title
        const nonExistentResults = await storage.searchTranscripts({ title: 'NonExistentTitle' });

        // 6. Verify we got no results
        expect(nonExistentResults.items.length).toBe(0);
    }, TIMEOUT);

    it('should search transcripts by speaker correctly', async () => {
        // 1. Search for transcripts with Alice as speaker
        const aliceResults = await storage.searchTranscripts({ speaker: 'Alice' });

        // 2. Verify we got the correct transcripts (at least 2)
        expect(aliceResults.items.length).toBeGreaterThanOrEqual(2);

        // Verify all returned transcripts include Alice as a speaker
        for (const item of aliceResults.items) {
            expect(item.metadata.speakers).toContain('Alice');
        }

        // 3. Search for transcripts with Dave as speaker
        const daveResults = await storage.searchTranscripts({ speaker: 'Dave' });

        // 4. Verify we got the correct transcripts (at least 2)
        expect(daveResults.items.length).toBeGreaterThanOrEqual(2);

        // 5. Search for a non-existent speaker
        const nonExistentResults = await storage.searchTranscripts({ speaker: 'NonExistentSpeaker' });

        // 6. Verify we got no results
        expect(nonExistentResults.items.length).toBe(0);
    }, TIMEOUT);

    it('should search transcripts by tag correctly', async () => {
        // 1. Search for transcripts with marketing tag
        const marketingResults = await storage.searchTranscripts({ tag: 'marketing' });

        // 2. Verify we got the correct transcripts (at least 2)
        expect(marketingResults.items.length).toBeGreaterThanOrEqual(2);

        // Verify all returned transcripts include marketing as a tag
        for (const item of marketingResults.items) {
            expect(item.metadata.tags).toContain('marketing');
        }

        // 3. Search for transcripts with engineering tag
        const engineeringResults = await storage.searchTranscripts({ tag: 'engineering' });

        // 4. Verify we got the correct transcripts (at least 2)
        expect(engineeringResults.items.length).toBeGreaterThanOrEqual(2);

        // 5. Search for a non-existent tag
        const nonExistentResults = await storage.searchTranscripts({ tag: 'nonexistenttag' });

        // 6. Verify we got no results
        expect(nonExistentResults.items.length).toBe(0);
    }, TIMEOUT);

    it('should filter transcripts by date range correctly', async () => {
        // 1. Filter transcripts by date range covering Feb-Apr 2023
        const midRangeResults = await storage.searchTranscripts({
            dateFrom: '2023-02-01',
            dateTo: '2023-04-30'
        });

        // 2. Verify we got the correct transcripts (at least 3)
        expect(midRangeResults.items.length).toBeGreaterThanOrEqual(3);

        // Verify all returned transcripts are within the date range
        for (const item of midRangeResults.items) {
            const date = new Date(item.metadata.date);
            expect(date >= new Date('2023-02-01')).toBe(true);
            expect(date <= new Date('2023-04-30')).toBe(true);
        }

        // 3. Filter transcripts by an earlier date range
        const earlyResults = await storage.searchTranscripts({
            dateFrom: '2023-01-01',
            dateTo: '2023-02-15'
        });

        // 4. Verify we got the correct transcripts (at least 2)
        expect(earlyResults.items.length).toBeGreaterThanOrEqual(2);

        // 5. Filter transcripts by a later date range
        const lateResults = await storage.searchTranscripts({
            dateFrom: '2023-04-01',
            dateTo: '2023-05-31'
        });

        // 6. Verify we got the correct transcripts (at least 2)
        expect(lateResults.items.length).toBeGreaterThanOrEqual(2);

        // 7. Filter by a date range outside our test data
        const noResults = await storage.searchTranscripts({
            dateFrom: '2024-01-01',
            dateTo: '2024-12-31'
        });

        // 8. Verify we got no results
        expect(noResults.items.length).toBe(0);
    }, TIMEOUT);

    it('should filter transcripts by processing status correctly', async () => {
        // 1. Get one of our test transcripts and update its status to 'pending'
        const targetSourceId = testTranscripts[4].sourceId;
        await storage.updateProcessingStatus(targetSourceId, 1, 'pending');

        // 2. Search for 'pending' transcripts
        const pendingResults = await storage.searchTranscripts({ status: 'pending' });

        // 3. Verify we found at least one pending transcript
        expect(pendingResults.items.length).toBeGreaterThanOrEqual(1);

        // Verify our target transcript is included
        const foundTarget = pendingResults.items.some(
            item => item.metadata.sourceId === targetSourceId
        );
        expect(foundTarget).toBe(true);

        // 4. Search for 'processed' transcripts
        const processedResults = await storage.searchTranscripts({ status: 'processed' });

        // 5. Verify we found processed transcripts but not our target
        expect(processedResults.items.length).toBeGreaterThanOrEqual(4);
        const targetNotIncluded = !processedResults.items.some(
            item => item.metadata.sourceId === targetSourceId
        );
        expect(targetNotIncluded).toBe(true);

        // 6. Clean up by setting back to processed
        await storage.updateProcessingStatus(targetSourceId, 1, 'processed');
    }, TIMEOUT);

    it('should combine multiple search criteria with logical AND', async () => {
        // 1. Search with multiple criteria that should return results
        const combinedResults = await storage.searchTranscripts({
            title: 'Marketing',
            speaker: 'Alice',
            dateFrom: '2023-01-01',
            dateTo: '2023-12-31'
        });

        // 2. Verify we got results that match ALL criteria
        expect(combinedResults.items.length).toBeGreaterThanOrEqual(1);

        // Check each result matches all criteria
        for (const item of combinedResults.items) {
            expect(item.metadata.title.toLowerCase()).toContain('marketing');
            expect(item.metadata.speakers).toContain('Alice');

            const date = new Date(item.metadata.date);
            expect(date >= new Date('2023-01-01')).toBe(true);
            expect(date <= new Date('2023-12-31')).toBe(true);
        }

        // 3. Search with contradictory criteria
        const contradictoryResults = await storage.searchTranscripts({
            title: 'Marketing',
            speaker: 'Dave' // Dave is not in any Marketing meetings
        });

        // 4. Verify we got no results due to AND logic
        expect(contradictoryResults.items.length).toBe(0);
    }, TIMEOUT);

    it('should handle empty search results appropriately', async () => {
        // 1. Search with criteria that won't match anything
        const emptyResults = await storage.searchTranscripts({
            title: 'ThisTitleDoesNotExist',
            speaker: 'NonExistentSpeaker',
            tag: 'faketag'
        });

        // 2. Verify we got an empty array but a properly structured response
        expect(emptyResults).toHaveProperty('items');
        expect(emptyResults).toHaveProperty('total');
        expect(emptyResults.items).toEqual([]);
        expect(emptyResults.total).toBe(0);
    }, TIMEOUT);

    it('should return items when calling listTranscripts with no parameters (default parameters bug)', async () => {
        // This test reproduces the exact bug: when listTranscripts() is called without
        // parameters, it uses default values that cause the range calculation to fail,
        // returning correct total count but empty items array.
        // This is the core issue that breaks the GET /api/transcripts endpoint.
        
        // Call listTranscripts with no parameters (uses defaults)
        const result = await storage.listTranscripts();
        
        // Verify we get proper structure
        expect(result).toHaveProperty('items');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.items)).toBe(true);
        
        // The bug: total count is correct but items array is empty
        expect(result.total).toBeGreaterThanOrEqual(testTranscripts.length);
        expect(result.items.length).toBeGreaterThan(0); // This will FAIL with current bug
        
        // Verify that the items match our test data when bug is fixed
        if (result.items.length > 0) {
            const item = result.items[0];
            expect(item).toHaveProperty('url');
            expect(item).toHaveProperty('blobKey');
            expect(item).toHaveProperty('metadata');
            expect(item.metadata).toHaveProperty('sourceId');
            expect(item.metadata).toHaveProperty('title');
        }
    }, TIMEOUT);

    it('should return same data with explicit default parameters as with no parameters', async () => {
        // This test helps isolate the issue by comparing explicit vs implicit defaults
        // It verifies that once we fix the defaults, both approaches should work identically
        
        // Call with no parameters (uses defaults)
        const resultWithDefaults = await storage.listTranscripts();
        
        // Call with explicit parameters that should match corrected defaults
        const resultWithExplicit = await storage.listTranscripts(10, 0);
        
        // Both should return the same data structure and content
        expect(resultWithDefaults.total).toBe(resultWithExplicit.total);
        expect(resultWithDefaults.items.length).toBe(resultWithExplicit.items.length);
        
        // If we have items, they should be the same
        if (resultWithExplicit.items.length > 0) {
            expect(resultWithDefaults.items[0].metadata.sourceId)
                .toBe(resultWithExplicit.items[0].metadata.sourceId);
        }
    }, TIMEOUT);
});