/**
 * @file Type-Safe Utility Wrappers Tests
 * Tests the additional utility wrappers for common date operations
 */

import { typedDateUtils } from '@/lib/config';
import * as fc from 'fast-check';

describe('Type-Safe Utility Wrappers', () => {
    describe('user input validation utilities', () => {
        it('should validate user input dates with type guard', () => {
            const validDate = '2024-01-15';
            const invalidDate = '2024-13-45';
            
            expect(typedDateUtils.isValidUserInputDate(validDate)).toBe(true);
            expect(typedDateUtils.isValidUserInputDate(invalidDate)).toBe(false);
            
            // Type guard should narrow type
            if (typedDateUtils.isValidUserInputDate(validDate)) {
                // TypeScript should infer validDate as UserInputDateString here
                expect(validDate).toBe('2024-01-15');
            }
        });

        it('should validate and convert user input with error handling', () => {
            const validDate = '2024-01-15';
            const invalidDate = 'not-a-date';
            
            expect(typedDateUtils.validateUserInput(validDate)).toBe('2024-01-15');
            
            expect(() => {
                typedDateUtils.validateUserInput(invalidDate);
            }).toThrow(/Invalid user input date.*Expected YYYY-MM-DD format/);
        });

        it('should handle edge cases in user input validation', () => {
            const edgeCases = [
                { input: '2024-02-29', valid: true }, // Leap year
                { input: '2024-02-30', valid: false }, // Invalid leap year date
                { input: '2024-13-01', valid: false }, // Invalid month
                { input: '2024-01-32', valid: false }, // Invalid day
                { input: '2024-00-15', valid: false }, // Zero month
                { input: '2024-01-00', valid: false }, // Zero day
            ];

            edgeCases.forEach(({ input, valid }) => {
                expect(typedDateUtils.isValidUserInputDate(input)).toBe(valid);
                
                if (valid) {
                    expect(() => typedDateUtils.validateUserInput(input)).not.toThrow();
                } else {
                    expect(() => typedDateUtils.validateUserInput(input)).toThrow();
                }
            });
        });
    });

    describe('advanced date utilities', () => {
        it('should provide current date utilities', () => {
            const today = typedDateUtils.advanced.today();
            const yesterday = typedDateUtils.advanced.yesterday();
            const tomorrow = typedDateUtils.advanced.tomorrow();
            
            // Should all be valid user input format
            expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(yesterday).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(tomorrow).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            
            // Logical relationships should hold
            expect(typedDateUtils.advanced.daysBetween(
                typedDateUtils.fromUserInput(yesterday),
                typedDateUtils.fromUserInput(today)
            )).toBe(1);
            
            expect(typedDateUtils.advanced.daysBetween(
                typedDateUtils.fromUserInput(today),
                typedDateUtils.fromUserInput(tomorrow)
            )).toBe(1);
        });

        it('should check if date is today', () => {
            const today = typedDateUtils.advanced.today();
            const todayAsDb = typedDateUtils.fromUserInput(today);
            
            expect(typedDateUtils.advanced.isToday(todayAsDb)).toBe(true);
            
            // Add a day and it should not be today
            const tomorrow = typedDateUtils.addDays(todayAsDb, 1);
            expect(typedDateUtils.advanced.isToday(tomorrow)).toBe(false);
        });

        it('should calculate start and end of day', () => {
            const testDate = typedDateUtils.testDate('2024-01-15T14:30:45.123Z');
            
            const startOfDay = typedDateUtils.advanced.startOfDay(testDate);
            const endOfDay = typedDateUtils.advanced.endOfDay(testDate);
            
            expect(startOfDay).toMatch(/2024-01-15T00:00:00\.000Z/);
            expect(endOfDay).toMatch(/2024-01-15T23:59:59\.999Z/);
            
            // Start should be before end
            expect(typedDateUtils.isBefore(startOfDay, endOfDay)).toBe(true);
        });

        it('should calculate days between dates correctly', () => {
            const date1 = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            const date2 = typedDateUtils.testDate('2024-01-20T14:45:00.000Z');
            const date3 = typedDateUtils.testDate('2024-01-10T08:15:00.000Z');
            
            expect(typedDateUtils.advanced.daysBetween(date1, date2)).toBe(5);
            expect(typedDateUtils.advanced.daysBetween(date2, date1)).toBe(-5);
            expect(typedDateUtils.advanced.daysBetween(date3, date1)).toBe(5);
            expect(typedDateUtils.advanced.daysBetween(date1, date1)).toBe(0);
        });

        it('should format dates for different display contexts', () => {
            const testDate = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            
            const shortFormat = typedDateUtils.advanced.formatForDisplay(testDate, 'short');
            const longFormat = typedDateUtils.advanced.formatForDisplay(testDate, 'long');
            const isoFormat = typedDateUtils.advanced.formatForDisplay(testDate, 'iso');
            const relativeFormat = typedDateUtils.advanced.formatForDisplay(testDate, 'relative');
            
            expect(shortFormat).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // e.g., "1/15/2024"
            expect(longFormat).toMatch(/January \d{1,2}, \d{4}/); // e.g., "January 15, 2024"
            expect(isoFormat).toBe('2024-01-15');
            expect(typeof relativeFormat).toBe('string'); // e.g., "2 days ago"
        });

        it('should throw error for unknown display format', () => {
            const testDate = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            
            expect(() => {
                typedDateUtils.advanced.formatForDisplay(testDate, 'unknown' as any);
            }).toThrow(/Unknown display format: unknown/);
        });
    });

    describe('Property-based testing for utility wrappers', () => {
        it('should maintain consistency in user input validation', () => {
            fc.assert(
                fc.property(fc.string(), (str) => {
                    const isValid = typedDateUtils.isValidUserInputDate(str);
                    
                    if (isValid) {
                        // If isValidUserInputDate returns true, validateUserInput should not throw
                        expect(() => typedDateUtils.validateUserInput(str)).not.toThrow();
                    } else {
                        // If isValidUserInputDate returns false, validateUserInput should throw
                        expect(() => typedDateUtils.validateUserInput(str)).toThrow();
                    }
                })
            );
        });

        it('should maintain consistency in day calculations', () => {
            fc.assert(
                fc.property(
                    fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
                    fc.integer({ min: -365, max: 365 }),
                    (date, daysToAdd) => {
                        if (!isFinite(date.getTime())) {
                            return true; // Skip invalid dates
                        }
                        
                        const isoString = date.toISOString();
                        const baseDate = typedDateUtils.casting.toDatabaseDateString(isoString);
                        const futureDate = typedDateUtils.addDays(baseDate, daysToAdd);
                        
                        // Days between should equal the original offset
                        const calculatedDays = typedDateUtils.advanced.daysBetween(baseDate, futureDate);
                        expect(Math.abs(calculatedDays - daysToAdd)).toBeLessThanOrEqual(1); // Allow for timezone edge cases
                    }
                )
            );
        });

        it('should maintain start/end of day relationships', () => {
            fc.assert(
                fc.property(
                    fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
                    (date) => {
                        if (!isFinite(date.getTime())) {
                            return true; // Skip invalid dates
                        }
                        
                        const isoString = date.toISOString();
                        const dbDate = typedDateUtils.casting.toDatabaseDateString(isoString);
                        
                        const startOfDay = typedDateUtils.advanced.startOfDay(dbDate);
                        const endOfDay = typedDateUtils.advanced.endOfDay(dbDate);
                        
                        // Start should always be before end
                        expect(typedDateUtils.isBefore(startOfDay, endOfDay)).toBe(true);
                        
                        // They should be on the same day
                        expect(startOfDay.substring(0, 10)).toBe(endOfDay.substring(0, 10));
                    }
                )
            );
        });

        it('should provide consistent today/yesterday/tomorrow relationships', () => {
            const today = typedDateUtils.advanced.today();
            const yesterday = typedDateUtils.advanced.yesterday();
            const tomorrow = typedDateUtils.advanced.tomorrow();
            
            const todayDb = typedDateUtils.fromUserInput(today);
            const yesterdayDb = typedDateUtils.fromUserInput(yesterday);
            const tomorrowDb = typedDateUtils.fromUserInput(tomorrow);
            
            // Verify ordering
            expect(typedDateUtils.isBefore(yesterdayDb, todayDb)).toBe(true);
            expect(typedDateUtils.isAfter(tomorrowDb, todayDb)).toBe(true);
            
            // Verify day differences
            expect(typedDateUtils.advanced.daysBetween(yesterdayDb, todayDb)).toBe(1);
            expect(typedDateUtils.advanced.daysBetween(todayDb, tomorrowDb)).toBe(1);
            expect(typedDateUtils.advanced.daysBetween(yesterdayDb, tomorrowDb)).toBe(2);
        });
    });

    describe('Type safety verification', () => {
        it('should enforce type safety at compile time for all utilities', () => {
            // These are compile-time checks - if TypeScript compiles, they pass
            const userDate = typedDateUtils.advanced.today();
            const dbDate = typedDateUtils.fromUserInput(userDate);
            
            // All these operations should be type-safe
            const startOfDay = typedDateUtils.advanced.startOfDay(dbDate);
            const endOfDay = typedDateUtils.advanced.endOfDay(dbDate);
            const isToday = typedDateUtils.advanced.isToday(dbDate);
            const daysBetween = typedDateUtils.advanced.daysBetween(startOfDay, endOfDay);
            const formatted = typedDateUtils.advanced.formatForDisplay(dbDate, 'long');
            
            // Runtime verification
            expect(typeof userDate).toBe('string');
            expect(typeof dbDate).toBe('string');
            expect(typeof startOfDay).toBe('string');
            expect(typeof endOfDay).toBe('string');
            expect(typeof isToday).toBe('boolean');
            expect(typeof daysBetween).toBe('number');
            expect(typeof formatted).toBe('string');
        });
    });
});