/**
 * @file Type Guards Tests for Enhanced Date Type Safety
 * Tests the runtime validation functions for branded date types
 */

import { dateTypeGuards } from '@/lib/config';
import * as fc from 'fast-check';

describe('dateTypeGuards', () => {
  describe('isDatabaseDateString', () => {
    it('should accept valid ISO 8601 dates with Z timezone', () => {
      const validDates = [
        '2024-01-15T10:30:00.000Z',
        '2024-12-31T23:59:59.999Z',
        '2024-01-01T00:00:00.000Z',
        '2024-06-15T12:00:00Z', // Without milliseconds
      ];

      validDates.forEach(date => {
        expect(dateTypeGuards.isDatabaseDateString(date)).toBe(true);
      });
    });

    it('should accept valid ISO 8601 dates with timezone offsets', () => {
      const validDates = [
        '2024-01-15T10:30:00.000+00:00',
        '2024-01-15T10:30:00.000-05:00',
        '2024-01-15T10:30:00.000+08:30',
        '2024-01-15T10:30:00+00:00', // Without milliseconds
      ];

      validDates.forEach(date => {
        expect(dateTypeGuards.isDatabaseDateString(date)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidDates = [
        '2024-01-15', // User input format
        '2024-01-15 10:30:00', // Missing T separator
        '2024-01-15T10:30:00', // Missing timezone
        'January 15, 2024', // Display format
        '2024/01/15', // Wrong separators
        'not-a-date',
        '',
        null,
        undefined,
        123,
        new Date(),
      ];

      invalidDates.forEach(date => {
        expect(dateTypeGuards.isDatabaseDateString(date)).toBe(false);
      });
    });

    it('should reject invalid dates that match format but are impossible', () => {
      const impossibleDates = [
        '2024-02-30T10:30:00.000Z', // February 30th doesn't exist
        '2024-13-01T10:30:00.000Z', // Month 13 doesn't exist
        '2024-01-32T10:30:00.000Z', // January 32nd doesn't exist
        '2024-01-15T25:30:00.000Z', // Hour 25 doesn't exist
        '2024-01-15T10:60:00.000Z', // Minute 60 doesn't exist
      ];

      impossibleDates.forEach(date => {
        expect(dateTypeGuards.isDatabaseDateString(date)).toBe(false);
      });
    });

    it('should validate real date with property-based testing', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
          (date) => {
            const isoString = date.toISOString();
            expect(dateTypeGuards.isDatabaseDateString(isoString)).toBe(true);
          }
        )
      );
    });
  });

  describe('isUserInputDateString', () => {
    it('should accept valid YYYY-MM-DD dates', () => {
      const validDates = [
        '2024-01-15',
        '2024-12-31',
        '2024-01-01',
        '2000-01-01',
        '2030-12-31',
      ];

      validDates.forEach(date => {
        expect(dateTypeGuards.isUserInputDateString(date)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidDates = [
        '2024-01-15T10:30:00.000Z', // Database format
        'January 15, 2024', // Display format
        '2024/01/15', // Wrong separators
        '24-01-15', // Two-digit year
        '2024-1-15', // Single-digit month
        '2024-01-5', // Single-digit day
        'not-a-date',
        '',
        null,
        undefined,
        123,
        new Date(),
      ];

      invalidDates.forEach(date => {
        expect(dateTypeGuards.isUserInputDateString(date)).toBe(false);
      });
    });

    it('should reject invalid dates that match format but are impossible', () => {
      const impossibleDates = [
        '2024-02-30', // February 30th doesn't exist
        '2024-13-01', // Month 13 doesn't exist
        '2024-01-32', // January 32nd doesn't exist
        '2024-00-15', // Month 0 doesn't exist
        '2024-01-00', // Day 0 doesn't exist
      ];

      impossibleDates.forEach(date => {
        expect(dateTypeGuards.isUserInputDateString(date)).toBe(false);
      });
    });

    it('should validate user input dates with property-based testing', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
          (date) => {
            const userInputString = date.toISOString().split('T')[0];
            expect(dateTypeGuards.isUserInputDateString(userInputString)).toBe(true);
          }
        )
      );
    });
  });

  describe('isDisplayDateString', () => {
    it('should accept valid display format dates', () => {
      const validDates = [
        'January 15, 2024',
        'December 31, 2024',
        'Jan 15, 2024',
        'Dec 31, 2024',
        'February 29, 2024', // Leap year
      ];

      validDates.forEach(date => {
        expect(dateTypeGuards.isDisplayDateString(date)).toBe(true);
      });
    });

    it('should reject invalid formats', () => {
      const invalidDates = [
        '2024-01-15', // User input format
        '2024-01-15T10:30:00.000Z', // Database format
        '2024/01/15', // Wrong separators
        'not-a-date',
        '',
        null,
        undefined,
        123,
        new Date(),
      ];

      invalidDates.forEach(date => {
        expect(dateTypeGuards.isDisplayDateString(date)).toBe(false);
      });
    });
  });

  describe('assertDatabaseDateString', () => {
    it('should return valid DatabaseDateString when input is valid', () => {
      const validDate = '2024-01-15T10:30:00.000Z';
      const result = dateTypeGuards.assertDatabaseDateString(validDate);
      expect(result).toBe(validDate);
      // TypeScript should infer this as DatabaseDateString type
    });

    it('should throw detailed error for invalid string format', () => {
      expect(() => {
        dateTypeGuards.assertDatabaseDateString('2024-01-15', 'API response');
      }).toThrow(/Invalid API response.*not a valid DatabaseDateString/);
    });

    it('should throw detailed error for non-string types', () => {
      expect(() => {
        dateTypeGuards.assertDatabaseDateString(123, 'database query');
      }).toThrow(/Invalid database query.*expected DatabaseDateString but got number/);
    });

    it('should include helpful usage guidance in error messages', () => {
      expect(() => {
        dateTypeGuards.assertDatabaseDateString('invalid-date');
      }).toThrow(/Use dateUtils\.toDatabase\(\) to convert from other formats/);
    });
  });

  describe('assertUserInputDateString', () => {
    it('should return valid UserInputDateString when input is valid', () => {
      const validDate = '2024-01-15';
      const result = dateTypeGuards.assertUserInputDateString(validDate);
      expect(result).toBe(validDate);
      // TypeScript should infer this as UserInputDateString type
    });

    it('should throw detailed error for invalid string format', () => {
      expect(() => {
        dateTypeGuards.assertUserInputDateString('2024-01-15T10:30:00.000Z', 'form input');
      }).toThrow(/Invalid form input.*not a valid UserInputDateString/);
    });

    it('should throw detailed error for non-string types', () => {
      expect(() => {
        dateTypeGuards.assertUserInputDateString(null, 'API parameter');
      }).toThrow(/Invalid API parameter.*expected UserInputDateString but got object/);
    });
  });

  describe('assertDisplayDateString', () => {
    it('should return valid DisplayDateString when input is valid', () => {
      const validDate = 'January 15, 2024';
      const result = dateTypeGuards.assertDisplayDateString(validDate);
      expect(result).toBe(validDate);
      // TypeScript should infer this as DisplayDateString type
    });

    it('should throw detailed error for invalid string format', () => {
      expect(() => {
        dateTypeGuards.assertDisplayDateString('2024-01-15', 'UI display');
      }).toThrow(/Invalid UI display.*not a valid DisplayDateString/);
    });

    it('should throw detailed error for non-string types', () => {
      expect(() => {
        dateTypeGuards.assertDisplayDateString(undefined, 'formatted output');
      }).toThrow(/Invalid formatted output.*expected DisplayDateString but got undefined/);
    });

    it('should include helpful usage guidance in error messages', () => {
      expect(() => {
        dateTypeGuards.assertDisplayDateString('invalid-date');
      }).toThrow(/Use dateUtils\.toUserDisplay\(\) to convert from other formats/);
    });
  });

  describe('Property-based edge case testing', () => {
    it('should handle all string inputs consistently for database format', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const result = dateTypeGuards.isDatabaseDateString(str);
          expect(typeof result).toBe('boolean');
          
          // If it returns true, assertDatabaseDateString should not throw
          if (result) {
            expect(() => dateTypeGuards.assertDatabaseDateString(str)).not.toThrow();
          } else {
            expect(() => dateTypeGuards.assertDatabaseDateString(str)).toThrow();
          }
        })
      );
    });

    it('should handle all string inputs consistently for user input format', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const result = dateTypeGuards.isUserInputDateString(str);
          expect(typeof result).toBe('boolean');
          
          // If it returns true, assertUserInputDateString should not throw
          if (result) {
            expect(() => dateTypeGuards.assertUserInputDateString(str)).not.toThrow();
          } else {
            expect(() => dateTypeGuards.assertUserInputDateString(str)).toThrow();
          }
        })
      );
    });

    it('should handle all string inputs consistently for display format', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const result = dateTypeGuards.isDisplayDateString(str);
          expect(typeof result).toBe('boolean');
          
          // If it returns true, assertDisplayDateString should not throw
          if (result) {
            expect(() => dateTypeGuards.assertDisplayDateString(str)).not.toThrow();
          } else {
            expect(() => dateTypeGuards.assertDisplayDateString(str)).toThrow();
          }
        })
      );
    });
  });
});