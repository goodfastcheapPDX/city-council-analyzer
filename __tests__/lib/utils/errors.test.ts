import { describe, it, expect } from 'vitest';
import {
    AppError,
    NotFoundError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    ServiceUnavailableError,
    RateLimitError,
    handleApiError
} from '@/lib/utils/errors';

describe('Error Utility Classes', () => {
    describe('AppError', () => {
        it('should create a basic AppError with default status code', () => {
            const error = new AppError('Test error');

            expect(error).toBeInstanceOf(Error);
            expect(error.name).toBe('AppError');
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.details).toBeUndefined();
        });

        it('should create an AppError with custom status code and details', () => {
            const details = { field: 'test', issue: 'invalid' };
            const error = new AppError('Test error', 400, details);

            expect(error.statusCode).toBe(400);
            expect(error.details).toEqual(details);
        });
    });

    describe('Specialized Error Classes', () => {
        it('should create a NotFoundError with correct defaults', () => {
            const error = new NotFoundError();

            expect(error).toBeInstanceOf(AppError);
            expect(error.name).toBe('NotFoundError');
            expect(error.message).toBe('Resource not found');
            expect(error.statusCode).toBe(404);
        });

        it('should create a ValidationError with correct defaults', () => {
            const error = new ValidationError();

            expect(error).toBeInstanceOf(AppError);
            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe('Validation failed');
            expect(error.statusCode).toBe(400);
        });

        it('should create an AuthenticationError with correct defaults', () => {
            const error = new AuthenticationError();

            expect(error).toBeInstanceOf(AppError);
            expect(error.name).toBe('AuthenticationError');
            expect(error.message).toBe('Authentication failed');
            expect(error.statusCode).toBe(401);
        });

        it('should create an AuthorizationError with correct defaults', () => {
            const error = new AuthorizationError();

            expect(error).toBeInstanceOf(AppError);
            expect(error.name).toBe('AuthorizationError');
            expect(error.message).toBe('Authorization failed');
            expect(error.statusCode).toBe(403);
        });

        it('should create a ServiceUnavailableError with correct defaults', () => {
            const error = new ServiceUnavailableError();

            expect(error).toBeInstanceOf(AppError);
            expect(error.name).toBe('ServiceUnavailableError');
            expect(error.message).toBe('Service unavailable');
            expect(error.statusCode).toBe(503);
        });

        it('should create a RateLimitError with correct defaults', () => {
            const error = new RateLimitError();

            expect(error).toBeInstanceOf(AppError);
            expect(error.name).toBe('RateLimitError');
            expect(error.message).toBe('Rate limit exceeded');
            expect(error.statusCode).toBe(429);
        });
    });

    describe('handleApiError', () => {
        it('should handle AppError correctly', () => {
            const error = new ValidationError('Invalid input', { field: 'email' });
            const { statusCode, errorResponse } = handleApiError(error);

            expect(statusCode).toBe(400);
            expect(errorResponse).toEqual({
                error: 'Invalid input',
                details: { field: 'email' }
            });
        });

        it('should handle standard Error correctly', () => {
            const error = new Error('Something went wrong');
            const { statusCode, errorResponse } = handleApiError(error);

            expect(statusCode).toBe(500);
            expect(errorResponse).toEqual({
                error: 'Something went wrong'
            });
        });

        it('should handle unknown error types', () => {
            const { statusCode, errorResponse } = handleApiError('string error');

            expect(statusCode).toBe(500);
            expect(errorResponse).toEqual({
                error: 'Internal server error'
            });
        });
    });
});