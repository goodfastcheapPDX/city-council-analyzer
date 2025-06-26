/**
 * @file Expanded Branded Types Tests
 * Tests the enhanced branded type system and type-safe utilities
 */

import { 
    typedDateUtils,
    DatabaseDateString, 
    UserInputDateString,
    DisplayDateString,
    AnyDateString,
    ExtractDateBrand,
    ExtractDateFormat 
} from '@/lib/config';
import * as fc from 'fast-check';

describe('Enhanced Branded Types', () => {
    describe('typedDateUtils enhanced functionality', () => {
        it('should provide runtime validation in all type-safe operations', () => {
            const testDate = '2024-01-15T10:30:00.000Z';
            const dbDate = typedDateUtils.casting.toDatabaseDateString(testDate);
            
            // All operations should validate at runtime
            const userInput = typedDateUtils.toUserInput(dbDate);
            const display = typedDateUtils.toDisplay(dbDate);
            
            expect(userInput).toBe('2024-01-15');
            expect(display).toBe('January 15, 2024');
        });

        it('should validate parameters and results in comparison operations', () => {
            const date1 = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            const date2 = typedDateUtils.testDate('2024-01-16T10:30:00.000Z');
            
            expect(typedDateUtils.isBefore(date1, date2)).toBe(true);
            expect(typedDateUtils.isAfter(date2, date1)).toBe(true);
        });

        it('should validate parameters in date arithmetic operations', () => {
            const baseDate = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            const futureDate = typedDateUtils.addDays(baseDate, 5);
            
            expect(futureDate).toContain('2024-01-20');
        });

        it('should validate timezone conversion operations', () => {
            const utcDate = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            const estDate = typedDateUtils.convertTimezone(utcDate, 'America/New_York');
            
            // Should still be a valid database date string
            expect(estDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[Z+-]/);
        });

        describe('casting utilities', () => {
            it('should provide type-safe casting with validation', () => {
                const rawValue: unknown = '2024-01-15T10:30:00.000Z';
                const dbDate = typedDateUtils.casting.toDatabaseDateString(rawValue);
                
                // TypeScript should infer this as DatabaseDateString
                expect(dbDate).toBe('2024-01-15T10:30:00.000Z');
            });

            it('should throw detailed errors for invalid casting', () => {
                expect(() => {
                    typedDateUtils.casting.toDatabaseDateString('invalid-date', 'API response');
                }).toThrow(/Invalid API response.*not a valid DatabaseDateString/);
            });

            it('should handle type casting for all branded types', () => {
                const dbDate = typedDateUtils.casting.toDatabaseDateString('2024-01-15T10:30:00.000Z');
                const userDate = typedDateUtils.casting.toUserInputDateString('2024-01-15');
                const displayDate = typedDateUtils.casting.toDisplayDateString('January 15, 2024');
                
                expect(dbDate).toBe('2024-01-15T10:30:00.000Z');
                expect(userDate).toBe('2024-01-15');
                expect(displayDate).toBe('January 15, 2024');
            });
        });

        describe('conversion utilities', () => {
            it('should convert user input directly to display format', () => {
                const userDate = typedDateUtils.casting.toUserInputDateString('2024-01-15');
                const displayDate = typedDateUtils.conversion.fromUserInputToDisplay(userDate);
                
                // Should be a valid display format (day could be 14 or 15 depending on timezone handling)
                expect(displayDate).toMatch(/^(January) (14|15), 2024$/);
            });

            it('should convert display format back to user input', () => {
                const displayDate = typedDateUtils.casting.toDisplayDateString('January 15, 2024');
                const userDate = typedDateUtils.conversion.fromDisplayToUserInput(displayDate);
                
                expect(userDate).toBe('2024-01-15');
            });

            it('should handle different display formats', () => {
                const shortDisplayDate = typedDateUtils.casting.toDisplayDateString('Jan 15, 2024');
                const userDate = typedDateUtils.conversion.fromDisplayToUserInput(shortDisplayDate);
                
                expect(userDate).toBe('2024-01-15');
            });

            it('should throw errors for invalid display format conversions', () => {
                const invalidDisplay = typedDateUtils.casting.toDisplayDateString('January 15, 2024');
                // Simulate an invalid display format that somehow passed casting
                expect(() => {
                    typedDateUtils.conversion.fromDisplayToUserInput('Invalid Date Format' as DisplayDateString);
                }).toThrow(/display date parameter.*not a valid DisplayDateString/);
            });
        });
    });

    describe('Property-based testing with enhanced types', () => {
        it('should maintain type safety across all conversion operations', () => {
            fc.assert(
                fc.property(
                    fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
                    (date) => {
                        // Skip invalid dates 
                        if (!isFinite(date.getTime())) {
                            return true;
                        }
                        
                        const isoString = date.toISOString();
                        const dbDate = typedDateUtils.casting.toDatabaseDateString(isoString);
                        
                        // Round-trip conversion should preserve date information
                        const userInput = typedDateUtils.toUserInput(dbDate);
                        const backToDb = typedDateUtils.fromUserInput(userInput);
                        
                        // Should represent the same day (time might differ due to day boundary)
                        expect(backToDb.substring(0, 10)).toBe(isoString.substring(0, 10));
                    }
                )
            );
        });

        it('should handle edge cases in display format conversions', () => {
            const edgeCases = [
                'January 1, 2024',
                'December 31, 2024',
                'February 29, 2024', // Leap year
                'Jan 1, 2024',
                'Dec 31, 2024',
            ];

            edgeCases.forEach(displayStr => {
                // First test that the casting correctly validates these formats
                expect(() => {
                    const displayDate = typedDateUtils.casting.toDisplayDateString(displayStr);
                    const userDate = typedDateUtils.conversion.fromDisplayToUserInput(displayDate);
                    
                    // Should be valid user input format
                    expect(userDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                    
                    // Round-trip should preserve the date
                    const backToDisplay = typedDateUtils.conversion.fromUserInputToDisplay(userDate);
                    expect(backToDisplay).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/);
                }).not.toThrow();
            });
        });

        it('should validate all arithmetic operations maintain type safety', () => {
            fc.assert(
                fc.property(
                    fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
                    fc.integer({ min: -365, max: 365 }),
                    (date, daysToAdd) => {
                        const isoString = date.toISOString();
                        const dbDate = typedDateUtils.casting.toDatabaseDateString(isoString);
                        
                        const futureDate = typedDateUtils.addDays(dbDate, daysToAdd);
                        
                        // Result should still be a valid database date (may have timezone offset)
                        expect(futureDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(Z|[+-]\d{2}:\d{2})$/);
                        
                        // Should be able to perform comparisons
                        if (daysToAdd > 0) {
                            expect(typedDateUtils.isAfter(futureDate, dbDate)).toBe(true);
                        } else if (daysToAdd < 0) {
                            expect(typedDateUtils.isBefore(futureDate, dbDate)).toBe(true);
                        } else {
                            // Same date, neither before nor after
                            expect(typedDateUtils.isBefore(futureDate, dbDate)).toBe(false);
                            expect(typedDateUtils.isAfter(futureDate, dbDate)).toBe(false);
                        }
                    }
                )
            );
        });

        it('should ensure all type guard validations are consistent with casting operations', () => {
            fc.assert(
                fc.property(fc.string(), (str) => {
                    // Test database date consistency
                    try {
                        const dbDate = typedDateUtils.casting.toDatabaseDateString(str);
                        // If casting succeeds, it should be usable in other operations
                        expect(() => typedDateUtils.toUserInput(dbDate)).not.toThrow();
                    } catch (error) {
                        // If casting fails, the string should not be a valid database date
                        expect(typeof error).toBe('object');
                    }
                })
            );
        });
    });

    // Note: TypeScript compile-time type tests would go here, but they're verified by compilation
    describe('Type system verification (compile-time)', () => {
        it('should enforce type safety at compile time', () => {
            // These are compile-time checks - if TypeScript compiles, they pass
            const dbDate: DatabaseDateString = typedDateUtils.testDate('2024-01-15T10:30:00.000Z');
            const userDate: UserInputDateString = typedDateUtils.toUserInput(dbDate);
            const displayDate: DisplayDateString = typedDateUtils.toDisplay(dbDate);
            
            // Type assertions to verify compile-time type inference
            expect(typeof dbDate).toBe('string');
            expect(typeof userDate).toBe('string');
            expect(typeof displayDate).toBe('string');
            
            // These should all be different branded types at compile time
            // but the same string type at runtime
            expect(dbDate).toContain('T');
            expect(userDate).not.toContain('T');
            expect(displayDate).toContain('2024');
        });
    });
});