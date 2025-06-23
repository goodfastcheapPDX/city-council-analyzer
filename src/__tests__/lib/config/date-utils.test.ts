import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { dateUtils, dateFormats, typedDateUtils, DatabaseDateString, UserInputDateString, DisplayDateString } from '@/lib/config';

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

    describe('Enhanced Date Utilities', () => {
        describe('dateUtils.testDate', () => {
            it('should generate deterministic test dates', () => {
                // This test ensures that test date generation is consistent and reliable,
                // which is critical for reproducible test results and preventing
                // flaky tests due to time-dependent behavior.
                const testInput = '2024-01-15T10:30:00.000Z';
                const result = dateUtils.testDate(testInput);
                
                expect(result).toBe('2024-01-15T10:30:00.000Z');
                expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
            });

            it('should throw error for invalid test dates', () => {
                // This test ensures that invalid test dates are caught early,
                // preventing test setup errors and maintaining test reliability
                // across different development environments.
                const invalidDates = [
                    'invalid-date',
                    '2024-13-01',
                    '2024-01-32',
                    'not-a-date'
                ];

                invalidDates.forEach(invalidDate => {
                    expect(() => dateUtils.testDate(invalidDate))
                        .toThrow(/Invalid test date/);
                });
            });
        });

        describe('dateUtils.convertTimezone', () => {
            it('should convert dates to different timezones', () => {
                // This test ensures timezone conversion works correctly,
                // which is essential for handling user data from different
                // geographic locations and displaying times appropriately.
                const utcDate = '2024-01-15T12:00:00.000Z';
                const nyResult = dateUtils.convertTimezone(utcDate, 'America/New_York');
                const laResult = dateUtils.convertTimezone(utcDate, 'America/Los_Angeles');
                
                expect(nyResult).toMatch(/2024-01-15T\d{2}:\d{2}:\d{2}\.\d{3}-\d{2}:\d{2}/);
                expect(laResult).toMatch(/2024-01-15T\d{2}:\d{2}:\d{2}\.\d{3}-\d{2}:\d{2}/);
                expect(nyResult).not.toBe(laResult); // Different timezones should produce different results
            });

            it('should throw error for invalid timezones', () => {
                // This test ensures that invalid timezone specifications are caught,
                // preventing runtime errors when processing user data with
                // malformed or unsupported timezone information.
                const validDate = '2024-01-15T12:00:00.000Z';
                const invalidTimezones = [
                    'Invalid/Timezone',
                    'NotReal/City',
                    'BadFormat'
                ];

                invalidTimezones.forEach(timezone => {
                    expect(() => dateUtils.convertTimezone(validDate, timezone))
                        .toThrow(/Invalid timezone/);
                });
            });

            it('should throw error for invalid dates in timezone conversion', () => {
                // This test ensures that invalid input dates are rejected during
                // timezone conversion, maintaining data integrity throughout
                // the timezone transformation process.
                const invalidDates = ['invalid-date', '2024-13-01'];
                const validTimezone = 'America/New_York';

                invalidDates.forEach(invalidDate => {
                    expect(() => dateUtils.convertTimezone(invalidDate, validTimezone))
                        .toThrow(/Invalid date for timezone conversion/);
                });
            });
        });

        describe('dateUtils.isBefore and isAfter', () => {
            it('should correctly compare dates', () => {
                // This test ensures date comparison utilities work correctly,
                // which is essential for temporal queries, date filtering,
                // and chronological ordering in the transcript analysis system.
                const earlierDate = '2024-01-15T10:00:00.000Z';
                const laterDate = '2024-01-15T11:00:00.000Z';
                
                expect(dateUtils.isBefore(earlierDate, laterDate)).toBe(true);
                expect(dateUtils.isBefore(laterDate, earlierDate)).toBe(false);
                expect(dateUtils.isBefore(earlierDate, earlierDate)).toBe(false);
                
                expect(dateUtils.isAfter(laterDate, earlierDate)).toBe(true);
                expect(dateUtils.isAfter(earlierDate, laterDate)).toBe(false);
                expect(dateUtils.isAfter(earlierDate, earlierDate)).toBe(false);
            });

            it('should throw errors for invalid dates in comparisons', () => {
                // This test ensures that date comparison functions reject invalid
                // input dates, preventing logical errors in temporal analysis
                // and maintaining data integrity in date-based operations.
                const validDate = '2024-01-15T10:00:00.000Z';
                const invalidDate = 'invalid-date';

                expect(() => dateUtils.isBefore(invalidDate, validDate))
                    .toThrow(/Invalid first date for comparison/);
                expect(() => dateUtils.isBefore(validDate, invalidDate))
                    .toThrow(/Invalid second date for comparison/);
                expect(() => dateUtils.isAfter(invalidDate, validDate))
                    .toThrow(/Invalid first date for comparison/);
                expect(() => dateUtils.isAfter(validDate, invalidDate))
                    .toThrow(/Invalid second date for comparison/);
            });

            it('should handle valid date comparisons with mathematical consistency', () => {
                // This property test ensures that date comparison functions are
                // mathematically consistent across all valid date combinations,
                // maintaining logical correctness in temporal analysis operations.
                fc.assert(
                    fc.property(
                        fc.date({ 
                            min: new Date('2020-01-01'), 
                            max: new Date('2030-12-31'),
                            noInvalidDate: true // Only valid dates for mathematical consistency
                        }),
                        fc.date({ 
                            min: new Date('2020-01-01'), 
                            max: new Date('2030-12-31'),
                            noInvalidDate: true
                        }),
                        (date1, date2) => {
                            const iso1 = date1.toISOString();
                            const iso2 = date2.toISOString();
                            
                            const isBefore = dateUtils.isBefore(iso1, iso2);
                            const isAfter = dateUtils.isAfter(iso1, iso2);
                            const isEqual = iso1 === iso2;
                            
                            // Exactly one of these should be true (mutually exclusive)
                            const trueCount = [isBefore, isAfter, isEqual].filter(x => x).length;
                            expect(trueCount).toBe(1);
                        }
                    ),
                    { numRuns: 50 }
                );
            });
        });

        describe('dateUtils.toUserDisplay', () => {
            it('should format dates for user display', () => {
                // This test ensures that date display formatting works correctly,
                // which is essential for presenting dates in a human-readable
                // format throughout the user interface.
                const testDate = '2024-01-15T10:30:00.000Z';
                const displayFormat = dateUtils.toUserDisplay(testDate);
                
                expect(displayFormat).toContain('January');
                expect(displayFormat).toContain('15');
                expect(displayFormat).toContain('2024');
            });

            it('should throw error for invalid dates in display formatting', () => {
                // This test ensures that invalid dates are rejected during
                // display formatting, preventing display errors and maintaining
                // consistent user experience across the application.
                const invalidDates = ['invalid-date', '2024-13-01', 'not-a-date'];

                invalidDates.forEach(invalidDate => {
                    expect(() => dateUtils.toUserDisplay(invalidDate))
                        .toThrow(/Invalid date for display formatting/);
                });
            });
        });
    });

    describe('Error Handling for Core Functions', () => {
        describe('dateUtils.userInputToDatabase error cases', () => {
            it('should throw meaningful errors for invalid user input', () => {
                // This test ensures that invalid user input dates are properly
                // rejected with clear error messages, helping developers and users
                // understand and fix date input problems quickly.
                const invalidInputs = [
                    'invalid-date',
                    '2024-13-01',
                    '2024-01-32',
                    '24-01-15',
                    '2024/01/15'
                ];

                invalidInputs.forEach(invalidInput => {
                    expect(() => dateUtils.userInputToDatabase(invalidInput))
                        .toThrow(/Invalid user input date.*Expected format: YYYY-MM-DD/);
                });
            });
        });

        describe('dateUtils.databaseToUserInput error cases', () => {
            it('should throw meaningful errors for invalid database dates', () => {
                // This test ensures that corrupted or malformed database dates
                // are properly handled with clear error messages, preventing
                // system failures when processing inconsistent data.
                const invalidDbDates = [
                    'invalid-date',
                    '2024-13-01T00:00:00.000Z',
                    'not-an-iso-string'
                ];

                invalidDbDates.forEach(invalidDate => {
                    expect(() => dateUtils.databaseToUserInput(invalidDate))
                        .toThrow(/Invalid database date format.*Expected ISO 8601 format/);
                });
            });
        });

        describe('dateUtils.toDatabase error cases', () => {
            it('should throw meaningful errors for invalid Date objects', () => {
                // This test ensures that invalid Date objects are properly
                // rejected, preventing silent failures when converting
                // potentially corrupted Date instances to database format.
                const invalidDate = new Date('invalid-date');
                
                expect(() => dateUtils.toDatabase(invalidDate))
                    .toThrow(/Invalid Date object provided/);
            });

            it('should throw meaningful errors for invalid ISO strings', () => {
                // This test ensures that malformed ISO date strings are properly
                // handled during database conversion, maintaining data integrity
                // throughout the date processing pipeline.
                const invalidIsoStrings = [
                    '2024-13-01T25:00:00.000Z', // Invalid month and hour
                    '2024-01-32T10:00:00.000Z'  // Invalid day
                ];

                invalidIsoStrings.forEach(invalidIso => {
                    expect(() => dateUtils.toDatabase(invalidIso))
                        .toThrow(/Invalid.*date string/);
                });
            });
        });
    });

    describe('Type-Safe Date Utilities', () => {
        describe('typedDateUtils', () => {
            it('should provide type-safe database format conversion', () => {
                // This test ensures that type-safe utilities maintain the same
                // functionality as regular utilities while providing compile-time
                // type safety for preventing date format mixing errors.
                const userDate = '2024-01-15';
                const dbDate = typedDateUtils.toDatabaseFormat(userDate);
                
                expect(dbDate).toBe('2024-01-15T00:00:00.000Z');
                expect(typeof dbDate).toBe('string');
            });

            it('should provide type-safe user input conversion', () => {
                // This test ensures that branded type conversions work correctly
                // while maintaining runtime functionality, supporting both
                // type safety and backward compatibility.
                const userInput = '2024-01-15' as UserInputDateString;
                const dbDate = typedDateUtils.fromUserInput(userInput);
                const backToUser = typedDateUtils.toUserInput(dbDate);
                
                expect(dbDate).toBe('2024-01-15T00:00:00.000Z');
                expect(backToUser).toBe('2024-01-15');
            });

            it('should provide type-safe display formatting', () => {
                // This test ensures that type-safe display formatting maintains
                // functionality while providing compile-time guarantees about
                // date format consistency across the user interface.
                const dbDate = '2024-01-15T10:30:00.000Z' as DatabaseDateString;
                const displayDate = typedDateUtils.toDisplay(dbDate);
                
                expect(displayDate).toContain('January');
                expect(displayDate).toContain('15');
                expect(displayDate).toContain('2024');
            });

            it('should provide type-safe current timestamp generation', () => {
                // This test ensures that type-safe timestamp generation produces
                // valid database format dates while maintaining compile-time
                // type safety for preventing format confusion.
                const now = typedDateUtils.now();
                
                expect(now).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
                expect(typeof now).toBe('string');
            });

            it('should provide type-safe test date generation', () => {
                // This test ensures that type-safe test utilities work correctly
                // for creating deterministic test scenarios while maintaining
                // compile-time type safety guarantees.
                const testInput = '2024-01-15T10:30:00.000Z';
                const testDate = typedDateUtils.testDate(testInput);
                
                expect(testDate).toBe('2024-01-15T10:30:00.000Z');
                expect(typeof testDate).toBe('string');
            });
        });
    });

    describe('Luxon Integration Properties', () => {
        describe('UTC timezone consistency', () => {
            it('should always return UTC timezone for valid database operations', () => {
                // This property test ensures that all valid database date operations
                // consistently use UTC timezone, preventing timezone-related
                // bugs in date storage and retrieval operations.
                fc.assert(
                    fc.property(
                        fc.date({ 
                            min: new Date('2020-01-01'), 
                            max: new Date('2030-12-31'),
                            noInvalidDate: true // Only generate valid dates
                        }),
                        (date) => {
                            const dbFormat = dateUtils.toDatabase(date);
                            expect(dbFormat).toMatch(/Z$/); // Should end with Z (UTC)
                        }
                    ),
                    { numRuns: 50 }
                );
            });

            it('should properly handle invalid dates in database operations', () => {
                // This test ensures that invalid Date objects are properly rejected
                // with meaningful error messages, maintaining defensive programming
                // principles throughout the date handling system.
                fc.assert(
                    fc.property(
                        fc.date({ 
                            min: new Date('2020-01-01'), 
                            max: new Date('2030-12-31'),
                            noInvalidDate: false // Include invalid dates
                        }),
                        (date) => {
                            if (isNaN(date.getTime())) {
                                // Invalid dates should throw meaningful errors
                                expect(() => dateUtils.toDatabase(date))
                                    .toThrow(/Invalid Date object provided/);
                            } else {
                                // Valid dates should work correctly
                                const dbFormat = dateUtils.toDatabase(date);
                                expect(dbFormat).toMatch(/Z$/);
                            }
                        }
                    ),
                    { numRuns: 50 }
                );
            });

            it('should handle user input dates consistently across timezones', () => {
                // This test ensures that user input date conversion is consistent
                // regardless of system timezone, preventing date shifting bugs
                // that could affect transcript metadata accuracy.
                const userInputs = [
                    '2024-01-15',
                    '2024-02-29', // Leap year
                    '2024-12-31'
                ];

                userInputs.forEach(userInput => {
                    const dbFormat = dateUtils.userInputToDatabase(userInput);
                    expect(dbFormat).toMatch(/Z$/); // Should be UTC
                    expect(dbFormat.startsWith(userInput)).toBe(true); // Should preserve date
                });
            });
        });

        describe('Error message quality', () => {
            it('should provide helpful error messages for all error cases', () => {
                // This test ensures that error messages are descriptive and helpful,
                // supporting developer debugging and user experience when date
                // operations fail due to invalid input or system errors.
                const errorTestCases = [
                    {
                        fn: () => dateUtils.userInputToDatabase('invalid'),
                        expectedPattern: /Invalid user input date.*Expected format/
                    },
                    {
                        fn: () => dateUtils.databaseToUserInput('invalid'),
                        expectedPattern: /Invalid database date format.*Expected ISO 8601/
                    },
                    {
                        fn: () => dateUtils.convertTimezone('2024-01-15T10:00:00.000Z', 'Invalid/Zone'),
                        expectedPattern: /Invalid timezone/
                    },
                    {
                        fn: () => dateUtils.isBefore('invalid', '2024-01-15T10:00:00.000Z'),
                        expectedPattern: /Invalid first date for comparison/
                    },
                    {
                        fn: () => dateUtils.toUserDisplay('invalid'),
                        expectedPattern: /Invalid date for display formatting/
                    }
                ];

                errorTestCases.forEach(({ fn, expectedPattern }) => {
                    expect(fn).toThrow(expectedPattern);
                });
            });
        });
    });
});