import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { dateUtils, dateFormats } from '@/lib/config';

describe('Date Utilities - Single Source of Truth', () => {
    describe('dateUtils.userInputToDatabase', () => {
        it('should convert simple date to database format', () => {
            // This test ensures user input dates are correctly converted to database format,
            // maintaining consistency between user-facing forms and internal storage
            // which is critical for date-based queries and temporal analysis.
            const userDate = '2024-01-15';
            const dbFormat = dateUtils.userInputToDatabase(userDate);
            
            expect(dbFormat).toBe('2024-01-15T00:00:00.000Z');
            expect(dbFormat).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
        });

        it('should handle edge case dates correctly', () => {
            // This test ensures that edge case dates like leap years and month boundaries
            // are handled correctly, preventing date calculation errors in the system.
            const testCases = [
                { input: '2024-02-29', expected: '2024-02-29T00:00:00.000Z' }, // Leap year
                { input: '2023-12-31', expected: '2023-12-31T00:00:00.000Z' }, // Year boundary
                { input: '2024-01-01', expected: '2024-01-01T00:00:00.000Z' }  // Year start
            ];
            
            testCases.forEach(({ input, expected }) => {
                expect(dateUtils.userInputToDatabase(input)).toBe(expected);
            });
        });
    });

    describe('dateUtils.databaseToUserInput', () => {
        it('should extract date part from database format', () => {
            // This test ensures database timestamps can be converted back to simple dates,
            // which is essential for displaying dates in forms and user interfaces
            // while maintaining the underlying precision of database storage.
            const dbDate = '2024-01-15T10:30:45.123Z';
            const userFormat = dateUtils.databaseToUserInput(dbDate);
            
            expect(userFormat).toBe('2024-01-15');
        });

        it('should handle various database timestamp formats', () => {
            // This test ensures that different database timestamp formats are handled
            // consistently, accounting for timezone variations and precision differences
            // that may occur across different database configurations.
            const testCases = [
                '2024-01-15T00:00:00.000Z',
                '2024-01-15T10:30:45.123Z',
                '2024-01-15T23:59:59.999Z',
                '2024-01-15T00:00:00+00:00' // Alternative timezone format
            ];
            
            testCases.forEach(dbDate => {
                expect(dateUtils.databaseToUserInput(dbDate)).toBe('2024-01-15');
            });
        });
    });

    describe('dateUtils.isValidUserInput', () => {
        it('should validate correct date formats', () => {
            // This test ensures that valid user input dates are correctly identified,
            // preventing unnecessary rejection of legitimate dates and maintaining
            // smooth user experience during transcript metadata entry.
            const validDates = [
                '2024-01-15',
                '2023-12-31',
                '2024-02-29', // Leap year
                '2000-01-01'
            ];
            
            validDates.forEach(date => {
                expect(dateUtils.isValidUserInput(date)).toBe(true);
            });
        });

        it('should reject invalid date formats', () => {
            // This test ensures that malformed dates are caught during validation,
            // preventing invalid dates from entering the system and causing
            // temporal analysis errors or database constraint violations.
            const invalidDates = [
                '2024-1-15',      // Single digit month
                '2024-01-5',      // Single digit day
                '24-01-15',       // Two digit year
                '2024/01/15',     // Wrong separator
                '2024-13-01',     // Invalid month
                '2024-01-32',     // Invalid day
                '2023-02-29',     // Not a leap year
                'invalid-date',   // Completely invalid
                '2024-01-15T10:30:00' // Has time component
            ];
            
            invalidDates.forEach(date => {
                expect(dateUtils.isValidUserInput(date)).toBe(false);
            });
        });

        it('should validate dates with property-based testing', () => {
            // This property test ensures that date validation is robust across
            // all possible input combinations, maintaining system stability
            // when processing various date string formats from different sources.
            fc.assert(
                fc.property(
                    fc.string(),
                    (dateString) => {
                        const result = dateUtils.isValidUserInput(dateString);
                        
                        // Result should always be boolean
                        expect(typeof result).toBe('boolean');
                        
                        // If valid, should match YYYY-MM-DD pattern
                        if (result) {
                            expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('dateUtils.now', () => {
        it('should return current time in database format', () => {
            // This test ensures that current timestamp generation is consistent
            // with database format requirements, maintaining compatibility
            // with database storage and API response formats.
            const now = dateUtils.now();
            
            expect(now).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
            
            // Should be a valid ISO string
            const parsedDate = new Date(now);
            expect(parsedDate.toISOString()).toBe(now);
        });

        it('should return timestamps close to actual time', () => {
            // This test ensures that generated timestamps are accurate to the current time,
            // which is critical for audit trails, version tracking, and chronological
            // ordering of transcript operations throughout the system.
            const before = new Date().toISOString();
            const generated = dateUtils.now();
            const after = new Date().toISOString();
            
            expect(generated >= before).toBe(true);
            expect(generated <= after).toBe(true);
        });
    });

    describe('dateUtils.toDatabase', () => {
        it('should handle Date objects', () => {
            // This test ensures that Date objects are correctly converted to database format,
            // maintaining consistency when different parts of the system provide
            // Date objects instead of strings for database storage operations.
            const date = new Date('2024-01-15T10:30:00.000Z');
            const dbFormat = dateUtils.toDatabase(date);
            
            expect(dbFormat).toBe('2024-01-15T10:30:00.000Z');
        });

        it('should handle user input format strings', () => {
            // This test ensures that simple date strings are correctly converted
            // to database format, supporting the common use case of form inputs
            // being stored in the database with proper timestamp precision.
            const userInput = '2024-01-15';
            const dbFormat = dateUtils.toDatabase(userInput);
            
            expect(dbFormat).toBe('2024-01-15T00:00:00.000Z');
        });

        it('should pass through existing database format', () => {
            // This test ensures that already-formatted database timestamps are preserved,
            // preventing unnecessary conversion that could introduce precision loss
            // or timezone handling errors in database operations.
            const dbFormat = '2024-01-15T10:30:45.123Z';
            const result = dateUtils.toDatabase(dbFormat);
            
            expect(result).toBe(dbFormat);
        });

        it('should handle all input types correctly', () => {
            // This property test ensures that the universal date converter handles
            // all possible input combinations correctly, maintaining system stability
            // when processing dates from various sources and formats.
            const testInputs = [
                new Date('2024-01-15'),
                '2024-01-15',
                '2024-01-15T10:30:00.000Z'
            ];
            
            testInputs.forEach(input => {
                const result = dateUtils.toDatabase(input);
                expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
                
                // Should be a valid date
                expect(new Date(result).toISOString()).toBe(result);
            });
        });
    });

    describe('Integration - Date Format Consistency', () => {
        it('should maintain consistency through conversion cycle', () => {
            // This integration test ensures that date format conversions are lossless
            // and maintain consistency when data flows through the complete system
            // from user input to database storage and back to user display.
            const originalUserDate = '2024-01-15';
            
            // User input -> Database
            const dbFormat = dateUtils.userInputToDatabase(originalUserDate);
            expect(dbFormat).toBe('2024-01-15T00:00:00.000Z');
            
            // Database -> User input
            const backToUser = dateUtils.databaseToUserInput(dbFormat);
            expect(backToUser).toBe(originalUserDate);
            
            // Validation should work at each step
            expect(dateUtils.isValidUserInput(originalUserDate)).toBe(true);
            expect(dateUtils.isValidUserInput(backToUser)).toBe(true);
        });

        it('should work with actual database round-trip', () => {
            // This test simulates the actual flow of date data through the system,
            // ensuring that dates maintain their semantic meaning despite format
            // transformations required for database storage and user presentation.
            const userInputDate = '2023-12-25';
            
            // Simulate storage workflow
            const forStorage = dateUtils.toDatabase(userInputDate);
            
            // Simulate what database returns (with timezone)
            const fromDatabase = new Date(forStorage).toISOString();
            
            // Convert back for user display
            const forDisplay = dateUtils.databaseToUserInput(fromDatabase);
            
            expect(forDisplay).toBe(userInputDate);
            expect(fromDatabase.startsWith(userInputDate)).toBe(true);
        });
    });
});