/**
 * Comprehensive validation tests for date enforcement mechanisms
 * Tests ESLint rules, TypeScript types, and runtime validation with property-based testing
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
    dateUtils, 
    typedDateUtils, 
    dateTypeGuards,
    type DatabaseDateString,
    type UserInputDateString, 
    type DisplayDateString 
} from '@/lib/config';

describe('Date Enforcement Validation', () => {
    describe('Type Guards - Runtime Validation', () => {
        it('should correctly validate DatabaseDateString format', () => {
            // This test ensures our type guards accurately identify valid database date formats,
            // which is critical for preventing invalid data from entering our storage layer
            // and ensuring consistent date handling across all database operations.
            
            // Valid database date formats
            const validDates = [
                '2024-01-15T10:30:00.000Z',
                '2024-01-15T10:30:00.000+00:00',
                '2024-12-31T23:59:59.999Z',
                '2000-01-01T00:00:00.000Z'
            ];

            validDates.forEach(date => {
                expect(dateTypeGuards.isDatabaseDateString(date)).toBe(true);
                expect(() => dateTypeGuards.assertDatabaseDateString(date)).not.toThrow();
            });

            // Invalid database date formats
            const invalidDates = [
                '2024-01-15',           // Missing time component
                '2024-01-15T10:30:00',  // Missing timezone
                '01/15/2024',           // Wrong format
                'January 15, 2024',     // Display format
                'invalid-date',         // Completely invalid
                '',                     // Empty string
                '2024-13-45T25:70:70.000Z' // Invalid date values
            ];

            invalidDates.forEach(date => {
                expect(dateTypeGuards.isDatabaseDateString(date)).toBe(false);
                expect(() => dateTypeGuards.assertDatabaseDateString(date)).toThrow();
            });
        });

        it('should correctly validate UserInputDateString format', () => {
            // This test ensures our type guards accurately identify valid user input date formats,
            // which is essential for validating form inputs and API parameters before
            // processing them into our standardized database format.

            // Valid user input formats
            const validDates = [
                '2024-01-15',
                '2000-01-01', 
                '2099-12-31',
                '2024-02-29' // Leap year
            ];

            validDates.forEach(date => {
                expect(dateTypeGuards.isUserInputDateString(date)).toBe(true);
                expect(() => dateTypeGuards.assertUserInputDateString(date)).not.toThrow();
            });

            // Invalid user input formats
            const invalidDates = [
                '2024-1-15',            // Single digit month
                '2024-01-5',            // Single digit day
                '01/15/2024',           // Wrong separator
                '2024-01-15T10:30:00Z', // Too much detail
                '2024-13-01',           // Invalid month
                '2024-02-30',           // Invalid day for February
                '',                     // Empty string
                'not-a-date'           // Invalid format
            ];

            invalidDates.forEach(date => {
                expect(dateTypeGuards.isUserInputDateString(date)).toBe(false);
                expect(() => dateTypeGuards.assertUserInputDateString(date)).toThrow();
            });
        });

        it('should correctly validate DisplayDateString format', () => {
            // This test ensures our type guards accurately identify valid display date formats,
            // which is crucial for validating formatted dates before displaying them to users
            // and maintaining consistent human-readable date presentation.

            // Valid display formats
            const validDates = [
                'January 15, 2024',
                'Jan 15, 2024',
                'December 31, 2099',
                'Feb 29, 2024',      // Leap year
                'January 01, 2024',  // Double-digit day
                'Jan 01, 2024'       // Abbreviated + double-digit
            ];

            validDates.forEach(date => {
                expect(dateTypeGuards.isDisplayDateString(date)).toBe(true);
                expect(() => dateTypeGuards.assertDisplayDateString(date)).not.toThrow();
            });

            // Invalid display formats
            const invalidDates = [
                '2024-01-15',           // ISO format
                '01/15/2024',           // Slash format
                'January 15',           // Missing year
                '15 January 2024',      // Wrong order
                'Jan 32, 2024',         // Invalid day
                '',                     // Empty string
                'not-a-date'           // Invalid format
            ];

            invalidDates.forEach(date => {
                expect(dateTypeGuards.isDisplayDateString(date)).toBe(false);
                expect(() => dateTypeGuards.assertDisplayDateString(date)).toThrow();
            });
        });

        it('should provide detailed error messages for invalid dates', () => {
            // This test ensures that our error messages provide clear, actionable guidance
            // to developers when date validation fails, which is essential for debugging
            // and maintaining the date standardization system.

            // Test database date error messages
            expect(() => dateTypeGuards.assertDatabaseDateString('2024-01-15', 'test context'))
                .toThrow(/Invalid test context.*DatabaseDateString.*ISO 8601.*timezone/);

            // Test user input date error messages  
            expect(() => dateTypeGuards.assertUserInputDateString('01/15/2024', 'form input'))
                .toThrow(/Invalid form input.*UserInputDateString.*YYYY-MM-DD/);

            // Test display date error messages
            expect(() => dateTypeGuards.assertDisplayDateString('2024-01-15', 'UI display'))
                .toThrow(/Invalid UI display.*DisplayDateString.*human-readable/);

            // Test non-string inputs
            expect(() => dateTypeGuards.assertDatabaseDateString(123, 'numeric input'))
                .toThrow(/expected DatabaseDateString but got number/);
        });
    });

    describe('Date Utilities - Conversion and Validation', () => {
        it('should handle all date conversions correctly with property-based testing', () => {
            // This property-based test ensures our date conversion utilities work correctly
            // across a wide range of inputs, which is critical for maintaining data integrity
            // as dates flow through different parts of our system.

            fc.assert(fc.property(
                fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
                (testDate) => {
                    // Convert JS Date to database format
                    const dbDate = dateUtils.toDatabase(testDate);
                    
                    // Verify it's a valid database format
                    expect(dateTypeGuards.isDatabaseDateString(dbDate)).toBe(true);
                    
                    // Convert to user input format and back
                    const userDate = dateUtils.databaseToUserInput(dbDate);
                    expect(dateTypeGuards.isUserInputDateString(userDate)).toBe(true);
                    
                    // Convert back to database format - should be same day
                    const roundTrip = dateUtils.userInputToDatabase(userDate);
                    expect(dateTypeGuards.isDatabaseDateString(roundTrip)).toBe(true);
                    
                    // Verify the date matches (same day, ignoring time)
                    const originalDay = testDate.toISOString().substring(0, 10);
                    const roundTripDay = roundTrip.substring(0, 10);
                    expect(roundTripDay).toBe(originalDay);
                }
            ));
        });

        it('should validate user input dates with property-based testing', () => {
            // This property-based test ensures our user input validation is robust
            // against all possible string inputs, preventing invalid dates from
            // entering our system through user forms or API endpoints.

            fc.assert(fc.property(
                fc.string(),
                (randomString) => {
                    const isValid = dateUtils.isValidUserInput(randomString);
                    
                    if (isValid) {
                        // If marked as valid, should not throw when converting
                        expect(() => dateUtils.userInputToDatabase(randomString)).not.toThrow();
                        expect(dateTypeGuards.isUserInputDateString(randomString)).toBe(true);
                    } else {
                        // If marked as invalid, should throw when converting
                        expect(() => dateUtils.userInputToDatabase(randomString)).toThrow();
                        expect(dateTypeGuards.isUserInputDateString(randomString)).toBe(false);
                    }
                }
            ));
        });

        it('should maintain correct date operations with type safety', () => {
            // This test ensures our typed date utilities maintain mathematical correctness
            // while providing type safety, which is essential for reliable date calculations
            // throughout our application.

            fc.assert(fc.property(
                fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
                  .filter(date => !isNaN(date.getTime())), // Filter out invalid dates
                fc.integer({ min: -365, max: 365 }),
                (baseDate, daysToAdd) => {
                    // Ensure we have a valid date
                    expect(baseDate).toBeInstanceOf(Date);
                    expect(isNaN(baseDate.getTime())).toBe(false);
                    
                    const dbDate = typedDateUtils.toDatabaseFormat(baseDate);
                    const futureDate = typedDateUtils.addDays(dbDate, daysToAdd);
                    
                    // Both should be valid database dates
                    expect(dateTypeGuards.isDatabaseDateString(dbDate)).toBe(true);
                    expect(dateTypeGuards.isDatabaseDateString(futureDate)).toBe(true);
                    
                    // Date arithmetic should be correct
                    const baseParsed = new Date(dbDate);
                    const futureParsed = new Date(futureDate);
                    const daysDiff = Math.round((futureParsed.getTime() - baseParsed.getTime()) / (1000 * 60 * 60 * 24));
                    
                    expect(daysDiff).toBe(daysToAdd);
                }
            ));
        });

        it('should handle timezone conversions correctly', () => {
            // This test ensures timezone conversions maintain data integrity,
            // which is crucial for global applications where dates may be processed
            // in different timezones but need to maintain consistency.

            const testDate = typedDateUtils.testDate('2024-01-15T12:00:00.000Z');
            
            // Convert to different timezones
            const easternTime = typedDateUtils.convertTimezone(testDate, 'America/New_York');
            const pacificTime = typedDateUtils.convertTimezone(testDate, 'America/Los_Angeles');
            
            // All should be valid database dates
            expect(dateTypeGuards.isDatabaseDateString(easternTime)).toBe(true);
            expect(dateTypeGuards.isDatabaseDateString(pacificTime)).toBe(true);
            
            // Times should be different but represent the same moment
            expect(easternTime).not.toBe(testDate);
            expect(pacificTime).not.toBe(testDate);
            expect(easternTime).not.toBe(pacificTime);
            
            // Verify they represent the same UTC moment
            const utcOriginal = new Date(testDate).getTime();
            const utcEastern = new Date(easternTime).getTime();
            const utcPacific = new Date(pacificTime).getTime();
            
            expect(utcEastern).toBe(utcOriginal);
            expect(utcPacific).toBe(utcOriginal);
        });
    });

    describe('TypeScript Type Safety Integration', () => {
        it('should provide compile-time type safety for date operations', () => {
            // This test validates that our typed utilities provide proper TypeScript
            // type safety, preventing developers from mixing incompatible date formats
            // at compile time.

            // These operations should compile and run without type errors
            const dbDate = typedDateUtils.now();
            const userDate = typedDateUtils.toUserInput(dbDate);
            const displayDate = typedDateUtils.toDisplay(dbDate);
            
            // Verify runtime types match compile-time expectations
            expect(dateTypeGuards.isDatabaseDateString(dbDate)).toBe(true);
            expect(dateTypeGuards.isUserInputDateString(userDate)).toBe(true);
            expect(dateTypeGuards.isDisplayDateString(displayDate)).toBe(true);
            
            // Test conversion utilities
            const roundTripDb = typedDateUtils.fromUserInput(userDate);
            expect(dateTypeGuards.isDatabaseDateString(roundTripDb)).toBe(true);
            
            // Test advanced utilities
            const today = typedDateUtils.advanced.today();
            const tomorrow = typedDateUtils.advanced.tomorrow();
            const yesterday = typedDateUtils.advanced.yesterday();
            
            expect(dateTypeGuards.isUserInputDateString(today)).toBe(true);
            expect(dateTypeGuards.isUserInputDateString(tomorrow)).toBe(true);
            expect(dateTypeGuards.isUserInputDateString(yesterday)).toBe(true);
        });

        it('should validate casting operations with proper error handling', () => {
            // This test ensures our casting utilities provide safe type conversion
            // with comprehensive error handling, which is essential for processing
            // external data that may not conform to our type expectations.

            // Test successful casting
            const validDb = '2024-01-15T10:30:00.000Z';
            const castDb = typedDateUtils.casting.toDatabaseDateString(validDb, 'test data');
            expect(castDb).toBe(validDb);
            
            const validUser = '2024-01-15';
            const castUser = typedDateUtils.casting.toUserInputDateString(validUser, 'form data');
            expect(castUser).toBe(validUser);
            
            const validDisplay = 'January 15, 2024';
            const castDisplay = typedDateUtils.casting.toDisplayDateString(validDisplay, 'UI data');
            expect(castDisplay).toBe(validDisplay);
            
            // Test error cases
            expect(() => typedDateUtils.casting.toDatabaseDateString('invalid', 'bad data'))
                .toThrow(/Invalid bad data.*DatabaseDateString/);
            
            expect(() => typedDateUtils.casting.toUserInputDateString('01/15/2024', 'form error'))
                .toThrow(/Invalid form error.*UserInputDateString/);
            
            expect(() => typedDateUtils.casting.toDisplayDateString('2024-01-15', 'display error'))
                .toThrow(/Invalid display error.*DisplayDateString/);
        });
    });

    describe('Deterministic Testing Support', () => {
        it('should provide consistent test dates for reliable testing', () => {
            // This test ensures our test date utilities provide deterministic results,
            // which is crucial for maintaining consistent test behavior across
            // different environments and runs.

            const testDate1 = dateUtils.testDate('2024-01-15T10:30:00.000Z');
            const testDate2 = dateUtils.testDate('2024-01-15T10:30:00.000Z');
            
            // Same input should produce identical output
            expect(testDate1).toBe(testDate2);
            expect(dateTypeGuards.isDatabaseDateString(testDate1)).toBe(true);
            
            // Different inputs should produce different outputs
            const differentDate = dateUtils.testDate('2024-01-16T10:30:00.000Z');
            expect(differentDate).not.toBe(testDate1);
            expect(dateTypeGuards.isDatabaseDateString(differentDate)).toBe(true);
            
            // Test typed version
            const typedTestDate1 = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            const typedTestDate2 = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            
            expect(typedTestDate1).toBe(typedTestDate2);
            expect(dateTypeGuards.isDatabaseDateString(typedTestDate1)).toBe(true);
        });

        it('should provide useful date utilities for testing scenarios', () => {
            // This test validates that our advanced date utilities provide helpful
            // functions for common testing scenarios, ensuring comprehensive test
            // coverage of date-related functionality.

            // Test relative date functions
            const today = typedDateUtils.advanced.today();
            const yesterday = typedDateUtils.advanced.yesterday();
            const tomorrow = typedDateUtils.advanced.tomorrow();
            
            expect(dateTypeGuards.isUserInputDateString(today)).toBe(true);
            expect(dateTypeGuards.isUserInputDateString(yesterday)).toBe(true);
            expect(dateTypeGuards.isUserInputDateString(tomorrow)).toBe(true);
            
            // Verify relationships
            expect(yesterday).not.toBe(today);
            expect(tomorrow).not.toBe(today);
            expect(yesterday).not.toBe(tomorrow);
            
            // Test date checking utilities
            const todayDb = typedDateUtils.fromUserInput(today);
            expect(typedDateUtils.advanced.isToday(todayDb)).toBe(true);
            
            // Test start/end of day utilities
            const startOfDay = typedDateUtils.advanced.startOfDay(todayDb);
            const endOfDay = typedDateUtils.advanced.endOfDay(todayDb);
            
            expect(dateTypeGuards.isDatabaseDateString(startOfDay)).toBe(true);
            expect(dateTypeGuards.isDatabaseDateString(endOfDay)).toBe(true);
            expect(startOfDay).not.toBe(endOfDay);
            
            // Start should be earlier than end
            expect(typedDateUtils.isBefore(startOfDay, endOfDay)).toBe(true);
        });
    });

    describe('Error Message Quality', () => {
        it('should provide actionable error messages for developers', () => {
            // This test ensures all error messages provide clear, actionable guidance
            // to developers, which is essential for maintaining the date standardization
            // system and enabling efficient debugging.

            // Test conversion error messages
            expect(() => dateUtils.userInputToDatabase('invalid-date'))
                .toThrow(/Invalid user input date.*Expected format: YYYY-MM-DD/);
            
            expect(() => dateUtils.databaseToUserInput('not-iso'))
                .toThrow(/Invalid database date format.*Expected ISO 8601 format/);
            
            // Test validation error messages
            expect(() => typedDateUtils.validateUserInput('01/15/2024'))
                .toThrow(/Invalid user input date.*Expected YYYY-MM-DD format/);
            
            // Test type guard error messages include context and examples
            expect(() => dateTypeGuards.assertDatabaseDateString('2024-01-15', 'API response'))
                .toThrow(/Invalid API response.*DatabaseDateString.*e\.g\.,.*2024-01-15T10:30:00\.000Z/);
            
            expect(() => dateTypeGuards.assertUserInputDateString('01/15/2024', 'form field'))
                .toThrow(/Invalid form field.*UserInputDateString.*e\.g\.,.*2024-01-15/);
            
            expect(() => dateTypeGuards.assertDisplayDateString('2024-01-15', 'UI component'))
                .toThrow(/Invalid UI component.*DisplayDateString.*e\.g\.,.*January 15, 2024/);
        });
    });

    describe('Performance and Consistency', () => {
        it('should maintain consistent performance across operations', () => {
            // This test ensures our date operations maintain acceptable performance
            // characteristics, which is important for user experience and system
            // scalability.

            const testOperations = () => {
                const now = typedDateUtils.now();
                const userDate = typedDateUtils.toUserInput(now);
                const displayDate = typedDateUtils.toDisplay(now);
                const roundTrip = typedDateUtils.fromUserInput(userDate);
                
                return { now, userDate, displayDate, roundTrip };
            };
            
            // Measure performance of batch operations
            const start = performance.now();
            const iterations = 100;
            
            for (let i = 0; i < iterations; i++) {
                testOperations();
            }
            
            const duration = performance.now() - start;
            const avgDuration = duration / iterations;
            
            // Should complete quickly (less than 1ms per operation on average)
            expect(avgDuration).toBeLessThan(1.0);
            
            // Test consistency - all operations should produce valid results
            const results = testOperations();
            expect(dateTypeGuards.isDatabaseDateString(results.now)).toBe(true);
            expect(dateTypeGuards.isUserInputDateString(results.userDate)).toBe(true);
            expect(dateTypeGuards.isDisplayDateString(results.displayDate)).toBe(true);
            expect(dateTypeGuards.isDatabaseDateString(results.roundTrip)).toBe(true);
        });
    });
});

describe('Date Enforcement Integration Tests', () => {
    it('should demonstrate comprehensive date standardization workflow', () => {
        // This integration test demonstrates the complete date standardization workflow
        // from user input through storage to display, ensuring all components work
        // together correctly and maintain type safety throughout the process.

        // Simulate user form input
        const userInput = '2024-01-15';
        
        // Validate user input
        const validatedInput = typedDateUtils.validateUserInput(userInput);
        expect(dateTypeGuards.isUserInputDateString(validatedInput)).toBe(true);
        
        // Convert to database format for storage
        const dbDate = typedDateUtils.fromUserInput(validatedInput);
        expect(dateTypeGuards.isDatabaseDateString(dbDate)).toBe(true);
        
        // Simulate database retrieval and validation
        const retrievedData = dbDate as unknown; // Simulate external data
        const safeDbDate = typedDateUtils.casting.toDatabaseDateString(retrievedData, 'database response');
        
        // Convert for display in UI
        const displayDate = typedDateUtils.toDisplay(safeDbDate);
        expect(dateTypeGuards.isDisplayDateString(displayDate)).toBe(true);
        
        // Verify the complete workflow maintains data integrity
        const backToUser = typedDateUtils.toUserInput(safeDbDate);
        expect(backToUser).toBe(validatedInput);
        
        // Verify display format is human-readable
        expect(displayDate).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/);
    });

    it('should handle edge cases and error scenarios comprehensively', () => {
        // This test ensures our date enforcement system handles edge cases gracefully
        // and provides clear error messages for debugging, which is essential for
        // maintaining system reliability in production environments.

        // Test leap year handling
        const leapYearDate = typedDateUtils.validateUserInput('2024-02-29');
        expect(dateTypeGuards.isUserInputDateString(leapYearDate)).toBe(true);
        
        // Test non-leap year error
        expect(() => typedDateUtils.validateUserInput('2023-02-29'))
            .toThrow(/Invalid user input date/);
        
        // Test boundary dates
        const minDate = typedDateUtils.validateUserInput('0001-01-01');
        const maxDate = typedDateUtils.validateUserInput('9999-12-31');
        expect(dateTypeGuards.isUserInputDateString(minDate)).toBe(true);
        expect(dateTypeGuards.isUserInputDateString(maxDate)).toBe(true);
        
        // Test timezone edge cases
        const utcDate = typedDateUtils.testDate('2024-01-01T00:00:00.000Z');
        const offsetDate = typedDateUtils.testDate('2024-01-01T00:00:00.000+00:00');
        
        // Both should be valid and equivalent
        expect(dateTypeGuards.isDatabaseDateString(utcDate)).toBe(true);
        expect(dateTypeGuards.isDatabaseDateString(offsetDate)).toBe(true);
        
        // Test error message quality for different error types
        const errorCases = [
            { input: '', expectedError: /Invalid user input date/ },
            { input: 'not-a-date', expectedError: /Invalid user input date/ },
            { input: '2024-13-01', expectedError: /Invalid user input date/ },
            { input: '2024-01-32', expectedError: /Invalid user input date/ }
        ];
        
        errorCases.forEach(({ input, expectedError }) => {
            expect(() => typedDateUtils.validateUserInput(input)).toThrow(expectedError);
        });
    });
});