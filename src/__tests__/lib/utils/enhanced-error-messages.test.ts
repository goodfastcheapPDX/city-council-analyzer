import { describe, it, expect } from 'vitest';
import { validateSearchParams, validateDateRange } from '@/lib/utils/search-validation';

describe('Enhanced Error Messages - Issue #113 Completion', () => {
    describe('validateSearchParams comprehensive error messages', () => {
        it('should provide specific error message for invalid status with actual value', () => {
            // This test verifies that validation errors include the actual invalid value
            // in the error message, providing clear feedback to help users understand
            // and correct their input mistakes quickly.
            const result = validateSearchParams({ status: 'invalid-status' as any });
            
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('invalid-status');
            expect(result.errors[0]).toContain('pending, processed, failed');
        });

        it('should provide specific error message for invalid dateFrom with examples', () => {
            // This test ensures that date validation errors include the malformed input
            // and provide clear format examples, reducing user confusion and improving
            // the overall API user experience.
            const result = validateDateRange('bad-date-format');
            
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('bad-date-format');
            expect(result.errors[0]).toContain('YYYY-MM-DD');
            expect(result.errors[0]).toContain('2023-01-15');
        });

        it('should provide specific error message for invalid dateTo with examples', () => {
            // This test ensures that date validation errors are consistent for both
            // dateFrom and dateTo parameters, maintaining uniform error messaging
            // standards across the API validation layer.
            const result = validateDateRange(undefined, '2023-13-99');
            
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('2023-13-99');
            expect(result.errors[0]).toContain('YYYY-MM-DD');
            expect(result.errors[0]).toContain('2023-12-31');
        });

        it('should provide specific error message for invalid date range with both values', () => {
            // This test verifies that date range validation errors include both the
            // problematic dateFrom and dateTo values, making it immediately clear
            // to users which values need to be corrected.
            const result = validateDateRange('2023-12-31', '2023-01-01');
            
            expect(result.isValid).toBe(false);
            expect(result.errors[0]).toContain('2023-12-31');
            expect(result.errors[0]).toContain('2023-01-01');
            expect(result.errors[0]).toContain('start date comes before the end date');
        });

        it('should provide user-friendly guidance in all error messages', () => {
            // This test ensures that all error messages include helpful guidance
            // for users to understand not just what went wrong, but how to fix it,
            // improving the overall developer experience with the API.
            const result = validateSearchParams({
                status: 'wrong' as any,
                dateFrom: 'invalid',
                dateTo: 'also-invalid'
            });
            
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(2);
            
            // Each error should contain specific invalid values and guidance
            result.errors.forEach(error => {
                expect(error.length).toBeGreaterThan(20); // Substantive error messages
                expect(error).toMatch(/must be|Example:|Please ensure/); // Contains guidance
            });
        });
    });
});