/**
 * Application configuration
 */

import { DateTime } from 'luxon';

/**
 * Enhanced branded types for type-safe date handling with compile-time safety
 * These types prevent mixing different date formats at compile time
 */
export type DatabaseDateString = string & { 
    readonly __brand: 'DatabaseDate';
    readonly __format: 'ISO8601-UTC';
    readonly __usage: 'storage';
};

export type UserInputDateString = string & { 
    readonly __brand: 'UserInputDate';
    readonly __format: 'YYYY-MM-DD';
    readonly __usage: 'input';
};

export type DisplayDateString = string & { 
    readonly __brand: 'DisplayDate';
    readonly __format: 'human-readable';
    readonly __usage: 'display';
};

/**
 * Union type for all date string formats - useful for function parameters
 * that can accept any branded date type
 */
export type AnyDateString = DatabaseDateString | UserInputDateString | DisplayDateString;

/**
 * Type predicate to check if a value is any branded date string
 */
export type IsBrandedDateString<T> = T extends AnyDateString ? true : false;

/**
 * Extract the brand type from a branded date string
 */
export type ExtractDateBrand<T> = T extends DatabaseDateString 
    ? 'DatabaseDate'
    : T extends UserInputDateString 
    ? 'UserInputDate'
    : T extends DisplayDateString 
    ? 'DisplayDate'
    : never;

/**
 * Extract the format specification from a branded date string
 */
export type ExtractDateFormat<T> = T extends DatabaseDateString 
    ? 'ISO8601-UTC'
    : T extends UserInputDateString 
    ? 'YYYY-MM-DD'
    : T extends DisplayDateString 
    ? 'human-readable'
    : never;

/**
 * Compile-time type safety utilities for date handling
 * These are utility types for enforcing correct date type usage
 */
export type RequiresDatabaseDate<T extends DatabaseDateString> = T;
export type RequiresUserInputDate<T extends UserInputDateString> = T;
export type RequiresDisplayDate<T extends DisplayDateString> = T;
export type PreventDateMixing<T extends AnyDateString, U extends T> = U;

/**
 * Date and time formatting standards for the entire application
 * SINGLE SOURCE OF TRUTH for all date handling
 */
export const dateFormats = {
    /**
     * Database storage format: ISO 8601 with timezone
     * PostgreSQL/Supabase returns: "2024-01-15T10:30:00.000+00:00"
     * Our dateUtils normalize to: "2024-01-15T10:30:00.000Z" (UTC)
     * Both formats are equivalent and valid ISO 8601
     */
    database: 'YYYY-MM-DDTHH:mm:ss.sss[Z|±HH:mm]',   
    
    /**
     * User input format: Simple date for forms and API input
     * Example: "2024-01-15"
     */
    userInput: 'YYYY-MM-DD',
    
    /**
     * API response format: ISO 8601 UTC (normalized by dateUtils)
     * Example: "2024-01-15T10:30:00.000Z"
     */
    apiResponse: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    
    /**
     * Display format: Human-readable format for UI
     * Example: "January 15, 2024"
     */
    display: 'MMMM DD, YYYY'
} as const;

/**
 * Date utility functions for consistent formatting across the application
 * 
 * NOTE: All functions normalize dates to UTC format (ending in Z) for consistency,
 * even though PostgreSQL may return dates with explicit timezone offsets (+00:00).
 * Both formats represent the same time and are valid ISO 8601.
 */
export const dateUtils = {
    /**
     * Convert user input date (YYYY-MM-DD) to database format
     * @param userDate - Date in YYYY-MM-DD format
     * @returns ISO string for database storage
     */
    userInputToDatabase(userDate: string): string {
        // Parse the simple date and convert to ISO string
        // Note: This assumes UTC timezone for simple dates
        const parsed = DateTime.fromISO(userDate, { zone: 'utc' }).startOf('day');
        if (!parsed.isValid) {
            throw new Error(`Invalid user input date: ${userDate}. Expected format: YYYY-MM-DD`);
        }
        const result = parsed.toISO();
        if (!result) {
            throw new Error(`Failed to convert date to ISO format: ${userDate}`);
        }
        return result;
    },
    
    /**
     * Get current timestamp in database format
     * @returns Current time as ISO string
     */
    now(): string {
        const result = DateTime.now().toUTC().toISO();
        if (!result) {
            throw new Error('Failed to generate current timestamp');
        }
        return result;
    },
    
    /**
     * Convert database format to user input format
     * @param dbDate - Date from database (ISO string)
     * @returns Simple date string (YYYY-MM-DD)
     */
    databaseToUserInput(dbDate: string): string {
        const parsed = DateTime.fromISO(dbDate).toUTC();
        if (!parsed.isValid) {
            throw new Error(`Invalid database date format: ${dbDate}. Expected ISO 8601 format`);
        }
        const result = parsed.toISODate();
        if (!result) {
            throw new Error(`Failed to convert database date to user format: ${dbDate}`);
        }
        return result;
    },
    
    /**
     * Validate user input date format
     * @param dateString - Date string to validate
     * @returns True if valid YYYY-MM-DD format
     */
    isValidUserInput(dateString: string): boolean {
        const pattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!pattern.test(dateString)) {
            return false;
        }
        
        const parsed = DateTime.fromISO(dateString, { zone: 'utc' });
        return parsed.isValid && parsed.toISODate() === dateString;
    },
    
    /**
     * Parse any date input and return database format
     * @param input - Date string, Date object, or DateTime object
     * @returns ISO string for database storage
     */
    toDatabase(input: string | Date | DateTime): string {
        if (input instanceof Date) {
            const converted = DateTime.fromJSDate(input).toUTC();
            if (!converted.isValid) {
                throw new Error(`Invalid Date object provided: ${input}`);
            }
            const result = converted.toISO();
            if (!result) {
                throw new Error(`Failed to convert Date object to ISO format: ${input}`);
            }
            return result;
        }
        
        if (input instanceof DateTime) {
            const converted = input.toUTC();
            if (!converted.isValid) {
                throw new Error(`Invalid DateTime object provided: ${input}`);
            }
            const result = converted.toISO();
            if (!result) {
                throw new Error(`Failed to convert DateTime object to ISO format: ${input}`);
            }
            return result;
        }
        
        // If it's already in database format, return as-is after validation
        if (input.includes('T')) {
            const parsed = DateTime.fromISO(input).toUTC();
            if (!parsed.isValid) {
                throw new Error(`Invalid ISO date string: ${input}`);
            }
            const result = parsed.toISO();
            if (!result) {
                throw new Error(`Failed to convert ISO date string: ${input}`);
            }
            return result;
        }
        
        // Assume it's user input format
        return this.userInputToDatabase(input);
    },

    /**
     * Generate deterministic test date for reliable testing
     * @param isoString - ISO date string for testing
     * @returns ISO string in database format
     */
    testDate(isoString: string): string {
        const parsed = DateTime.fromISO(isoString, { zone: 'utc' });
        if (!parsed.isValid) {
            throw new Error(`Invalid test date: ${isoString}. Expected ISO 8601 format`);
        }
        const result = parsed.toISO();
        if (!result) {
            throw new Error(`Failed to convert test date to ISO format: ${isoString}`);
        }
        return result;
    },

    /**
     * Convert date to different timezone
     * @param date - ISO date string
     * @param targetZone - Target timezone (e.g., 'America/New_York')
     * @returns ISO string in target timezone
     */
    convertTimezone(date: string, targetZone: string): string {
        const parsed = DateTime.fromISO(date);
        if (!parsed.isValid) {
            throw new Error(`Invalid date for timezone conversion: ${date}`);
        }
        const converted = parsed.setZone(targetZone);
        if (!converted.isValid) {
            throw new Error(`Invalid timezone: ${targetZone}`);
        }
        const result = converted.toISO();
        if (!result) {
            throw new Error(`Failed to convert date to timezone ${targetZone}: ${date}`);
        }
        return result;
    },

    /**
     * Check if first date is before second date
     * @param date1 - First date (ISO string)
     * @param date2 - Second date (ISO string)
     * @returns True if date1 is before date2
     */
    isBefore(date1: string, date2: string): boolean {
        const parsed1 = DateTime.fromISO(date1);
        const parsed2 = DateTime.fromISO(date2);
        if (!parsed1.isValid) {
            throw new Error(`Invalid first date for comparison: ${date1}`);
        }
        if (!parsed2.isValid) {
            throw new Error(`Invalid second date for comparison: ${date2}`);
        }
        return parsed1 < parsed2;
    },

    /**
     * Check if first date is after second date
     * @param date1 - First date (ISO string)
     * @param date2 - Second date (ISO string)
     * @returns True if date1 is after date2
     */
    isAfter(date1: string, date2: string): boolean {
        const parsed1 = DateTime.fromISO(date1);
        const parsed2 = DateTime.fromISO(date2);
        if (!parsed1.isValid) {
            throw new Error(`Invalid first date for comparison: ${date1}`);
        }
        if (!parsed2.isValid) {
            throw new Error(`Invalid second date for comparison: ${date2}`);
        }
        return parsed1 > parsed2;
    },

    /**
     * Format date for user display (human-readable)
     * @param date - ISO date string
     * @returns Formatted date string (e.g., "January 15, 2024")
     */
    toUserDisplay(date: string): string {
        const parsed = DateTime.fromISO(date);
        if (!parsed.isValid) {
            throw new Error(`Invalid date for display formatting: ${date}`);
        }
        return parsed.toLocaleString(DateTime.DATE_FULL);
    },

    /**
     * Add days to a date
     * @param date - ISO date string
     * @param days - Number of days to add (can be negative)
     * @returns ISO string with days added
     */
    addDays(date: string, days: number): string {
        const parsed = DateTime.fromISO(date);
        if (!parsed.isValid) {
            throw new Error(`Invalid date for adding days: ${date}`);
        }
        const result = parsed.plus({ days }).toISO();
        if (!result) {
            throw new Error(`Failed to add ${days} days to date: ${date}`);
        }
        return result;
    }
} as const;

/**
 * Enhanced type guards for runtime validation of branded date types
 * Provides compile-time and runtime safety with clear error messages
 */
export const dateTypeGuards = {
    /**
     * Type guard for DatabaseDateString - validates ISO 8601 format with timezone
     * @param value - String to validate
     * @returns True if value is valid database date format
     */
    isDatabaseDateString(value: unknown): value is DatabaseDateString {
        if (typeof value !== 'string') {
            return false;
        }
        
        // Must be ISO 8601 format with timezone (either Z or ±HH:mm)
        const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
        if (!isoRegex.test(value)) {
            return false;
        }
        
        // Validate with Luxon to ensure it's a real date
        const parsed = DateTime.fromISO(value);
        return parsed.isValid;
    },

    /**
     * Type guard for UserInputDateString - validates YYYY-MM-DD format
     * @param value - String to validate
     * @returns True if value is valid user input date format
     */
    isUserInputDateString(value: unknown): value is UserInputDateString {
        if (typeof value !== 'string') {
            return false;
        }
        
        // Must be YYYY-MM-DD format
        const userInputRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!userInputRegex.test(value)) {
            return false;
        }
        
        // Validate with Luxon to ensure it's a real date
        const parsed = DateTime.fromISO(value, { zone: 'utc' });
        return parsed.isValid && parsed.toISODate() === value;
    },

    /**
     * Type guard for DisplayDateString - validates human-readable format
     * @param value - String to validate
     * @returns True if value is valid display date format
     */
    isDisplayDateString(value: unknown): value is DisplayDateString {
        if (typeof value !== 'string') {
            return false;
        }
        
        // Try to parse as a natural language date
        // This is more flexible but still validates it's a meaningful date string
        try {
            // Try full month format (January 15, 2024)
            const parsed = DateTime.fromFormat(value, 'MMMM d, yyyy');
            if (parsed.isValid) {
                return true;
            }
            
            // Try abbreviated month format (Jan 15, 2024)
            const altParsed = DateTime.fromFormat(value, 'MMM d, yyyy');
            if (altParsed.isValid) {
                return true;
            }
            
            // Try with double-digit day format (January 01, 2024)
            const ddParsed = DateTime.fromFormat(value, 'MMMM dd, yyyy');
            if (ddParsed.isValid) {
                return true;
            }
            
            // Try abbreviated with double-digit day (Jan 01, 2024)
            const altDdParsed = DateTime.fromFormat(value, 'MMM dd, yyyy');
            return altDdParsed.isValid;
        } catch {
            return false;
        }
    },

    /**
     * Assert and cast to DatabaseDateString with detailed error message
     * @param value - Value to validate and cast
     * @param context - Context for error message (e.g., "API response", "database query")
     * @returns Validated DatabaseDateString
     * @throws Error with detailed message if validation fails
     */
    assertDatabaseDateString(value: unknown, context = 'value'): DatabaseDateString {
        if (this.isDatabaseDateString(value)) {
            return value;
        }
        
        if (typeof value !== 'string') {
            throw new Error(
                `Invalid ${context}: expected DatabaseDateString but got ${typeof value}. ` +
                `DatabaseDateString must be ISO 8601 format with timezone (e.g., "2024-01-15T10:30:00.000Z")`
            );
        }
        
        throw new Error(
            `Invalid ${context}: "${value}" is not a valid DatabaseDateString. ` +
            `Expected ISO 8601 format with timezone (e.g., "2024-01-15T10:30:00.000Z" or "2024-01-15T10:30:00.000+00:00"). ` +
            `Use dateUtils.toDatabase() to convert from other formats.`
        );
    },

    /**
     * Assert and cast to UserInputDateString with detailed error message
     * @param value - Value to validate and cast
     * @param context - Context for error message (e.g., "form input", "API parameter")
     * @returns Validated UserInputDateString
     * @throws Error with detailed message if validation fails
     */
    assertUserInputDateString(value: unknown, context = 'value'): UserInputDateString {
        if (this.isUserInputDateString(value)) {
            return value;
        }
        
        if (typeof value !== 'string') {
            throw new Error(
                `Invalid ${context}: expected UserInputDateString but got ${typeof value}. ` +
                `UserInputDateString must be YYYY-MM-DD format (e.g., "2024-01-15")`
            );
        }
        
        throw new Error(
            `Invalid ${context}: "${value}" is not a valid UserInputDateString. ` +
            `Expected YYYY-MM-DD format (e.g., "2024-01-15"). ` +
            `Ensure the date is valid and follows the exact format.`
        );
    },

    /**
     * Assert and cast to DisplayDateString with detailed error message
     * @param value - Value to validate and cast
     * @param context - Context for error message (e.g., "UI display", "formatted output")
     * @returns Validated DisplayDateString
     * @throws Error with detailed message if validation fails
     */
    assertDisplayDateString(value: unknown, context = 'value'): DisplayDateString {
        if (this.isDisplayDateString(value)) {
            return value;
        }
        
        if (typeof value !== 'string') {
            throw new Error(
                `Invalid ${context}: expected DisplayDateString but got ${typeof value}. ` +
                `DisplayDateString must be human-readable format (e.g., "January 15, 2024")`
            );
        }
        
        throw new Error(
            `Invalid ${context}: "${value}" is not a valid DisplayDateString. ` +
            `Expected human-readable format (e.g., "January 15, 2024" or "Jan 15, 2024"). ` +
            `Use dateUtils.toUserDisplay() to convert from other formats.`
        );
    }
} as const;

/**
 * Enhanced type-safe date utilities with expanded branded types for compile-time safety
 * These utilities enforce correct date type usage and prevent mixing formats
 */
export const typedDateUtils = {
    /**
     * Convert to database format with type safety and validation
     * @param date - Date string or Date object
     * @returns Type-safe database date string
     */
    toDatabaseFormat(date: string | Date): DatabaseDateString {
        const result = dateUtils.toDatabase(date);
        return dateTypeGuards.assertDatabaseDateString(result, 'conversion result') as DatabaseDateString;
    },

    /**
     * Convert user input to database format with type safety and validation
     * @param userDate - Validated user input date string
     * @returns Type-safe database date string
     */
    fromUserInput(userDate: UserInputDateString): DatabaseDateString {
        // Runtime validation ensures the branded type is actually valid
        dateTypeGuards.assertUserInputDateString(userDate, 'user input parameter');
        const result = dateUtils.userInputToDatabase(userDate);
        return dateTypeGuards.assertDatabaseDateString(result, 'conversion result') as DatabaseDateString;
    },

    /**
     * Convert database date to user input format with type safety and validation
     * @param dbDate - Validated database date string
     * @returns Type-safe user input date string
     */
    toUserInput(dbDate: DatabaseDateString): UserInputDateString {
        // Runtime validation ensures the branded type is actually valid
        dateTypeGuards.assertDatabaseDateString(dbDate, 'database date parameter');
        const result = dateUtils.databaseToUserInput(dbDate);
        return dateTypeGuards.assertUserInputDateString(result, 'conversion result') as UserInputDateString;
    },

    /**
     * Convert database date to display format with type safety and validation
     * @param dbDate - Validated database date string
     * @returns Type-safe display date string
     */
    toDisplay(dbDate: DatabaseDateString): DisplayDateString {
        // Runtime validation ensures the branded type is actually valid
        dateTypeGuards.assertDatabaseDateString(dbDate, 'database date parameter');
        const result = dateUtils.toUserDisplay(dbDate);
        return dateTypeGuards.assertDisplayDateString(result, 'conversion result') as DisplayDateString;
    },

    /**
     * Generate current timestamp with type safety and validation
     * @returns Type-safe database date string
     */
    now(): DatabaseDateString {
        const result = dateUtils.now();
        return dateTypeGuards.assertDatabaseDateString(result, 'current timestamp') as DatabaseDateString;
    },

    /**
     * Generate test date with type safety and validation
     * @param isoString - ISO date string for testing
     * @returns Type-safe database date string
     */
    testDate(isoString: string): DatabaseDateString {
        const result = dateUtils.testDate(isoString);
        return dateTypeGuards.assertDatabaseDateString(result, 'test date') as DatabaseDateString;
    },

    /**
     * Validate user input date format with type safety
     * @param dateString - String to validate as user input format
     * @returns True if valid user input date format
     */
    isValidUserInputDate(dateString: string): dateString is UserInputDateString {
        return dateUtils.isValidUserInput(dateString);
    },

    /**
     * Validate and convert user input with type safety
     * @param dateString - Potentially valid user input date
     * @returns Type-safe user input date string or throws error
     */
    validateUserInput(dateString: string): UserInputDateString {
        if (this.isValidUserInputDate(dateString)) {
            return dateString;
        }
        throw new Error(
            `Invalid user input date: "${dateString}". Expected YYYY-MM-DD format (e.g., "2024-01-15").`
        );
    },

    /**
     * Compare two database dates with type safety
     * @param date1 - First database date
     * @param date2 - Second database date
     * @returns True if date1 is before date2
     */
    isBefore(date1: DatabaseDateString, date2: DatabaseDateString): boolean {
        dateTypeGuards.assertDatabaseDateString(date1, 'first date parameter');
        dateTypeGuards.assertDatabaseDateString(date2, 'second date parameter');
        return dateUtils.isBefore(date1, date2);
    },

    /**
     * Compare two database dates with type safety
     * @param date1 - First database date
     * @param date2 - Second database date
     * @returns True if date1 is after date2
     */
    isAfter(date1: DatabaseDateString, date2: DatabaseDateString): boolean {
        dateTypeGuards.assertDatabaseDateString(date1, 'first date parameter');
        dateTypeGuards.assertDatabaseDateString(date2, 'second date parameter');
        return dateUtils.isAfter(date1, date2);
    },

    /**
     * Add days to a database date with type safety
     * @param date - Database date string
     * @param days - Number of days to add (can be negative)
     * @returns Type-safe database date string
     */
    addDays(date: DatabaseDateString, days: number): DatabaseDateString {
        dateTypeGuards.assertDatabaseDateString(date, 'date parameter');
        const result = dateUtils.addDays(date, days);
        return dateTypeGuards.assertDatabaseDateString(result, 'date calculation result') as DatabaseDateString;
    },

    /**
     * Convert date to different timezone with type safety
     * @param date - Database date string
     * @param targetZone - Target timezone (e.g., 'America/New_York')
     * @returns Type-safe database date string in target timezone
     */
    convertTimezone(date: DatabaseDateString, targetZone: string): DatabaseDateString {
        dateTypeGuards.assertDatabaseDateString(date, 'date parameter');
        const result = dateUtils.convertTimezone(date, targetZone);
        return dateTypeGuards.assertDatabaseDateString(result, 'timezone conversion result') as DatabaseDateString;
    },

    /**
     * Validate and cast to branded date types with compile-time enforcement
     * These methods provide type-safe casting from unknown values
     */
    casting: {
        /**
         * Cast unknown value to DatabaseDateString with validation
         * @param value - Value to validate and cast
         * @param context - Context for error message
         * @returns Validated and cast DatabaseDateString
         */
        toDatabaseDateString(value: unknown, context = 'value'): DatabaseDateString {
            return dateTypeGuards.assertDatabaseDateString(value, context);
        },

        /**
         * Cast unknown value to UserInputDateString with validation
         * @param value - Value to validate and cast
         * @param context - Context for error message
         * @returns Validated and cast UserInputDateString
         */
        toUserInputDateString(value: unknown, context = 'value'): UserInputDateString {
            return dateTypeGuards.assertUserInputDateString(value, context);
        },

        /**
         * Cast unknown value to DisplayDateString with validation
         * @param value - Value to validate and cast
         * @param context - Context for error message
         * @returns Validated and cast DisplayDateString
         */
        toDisplayDateString(value: unknown, context = 'value'): DisplayDateString {
            return dateTypeGuards.assertDisplayDateString(value, context);
        },
    },

    /**
     * Type-safe conversion between branded date formats
     * These methods ensure only valid conversions are allowed at compile time
     */
    conversion: {
        /**
         * Convert between any branded date types through database format
         * This is the safest conversion path that preserves semantic meaning
         */
        fromUserInputToDisplay(userDate: UserInputDateString): DisplayDateString {
            const dbDate = typedDateUtils.fromUserInput(userDate);
            return typedDateUtils.toDisplay(dbDate);
        },

        /**
         * Convert display format back to user input (may lose precision)
         * Note: This conversion may not be perfectly reversible due to format differences
         */
        fromDisplayToUserInput(displayDate: DisplayDateString): UserInputDateString {
            // This is a complex conversion - parse display format first
            dateTypeGuards.assertDisplayDateString(displayDate, 'display date parameter');
            
            // Parse the display format and convert to database format first
            let parsed: DateTime;
            try {
                // Try all supported display formats in order of preference
                parsed = DateTime.fromFormat(displayDate, 'MMMM d, yyyy');
                if (!parsed.isValid) {
                    parsed = DateTime.fromFormat(displayDate, 'MMM d, yyyy');
                }
                if (!parsed.isValid) {
                    parsed = DateTime.fromFormat(displayDate, 'MMMM dd, yyyy');
                }
                if (!parsed.isValid) {
                    parsed = DateTime.fromFormat(displayDate, 'MMM dd, yyyy');
                }
            } catch (error) {
                throw new Error(`Cannot convert display date "${displayDate}" to user input format: ${error}`);
            }
            
            if (!parsed.isValid) {
                throw new Error(`Invalid display date format: "${displayDate}"`);
            }
            
            const userInputResult = parsed.toISODate();
            if (!userInputResult) {
                throw new Error(`Failed to convert display date "${displayDate}" to user input format`);
            }
            
            return dateTypeGuards.assertUserInputDateString(userInputResult, 'display date conversion result');
        }
    },

    /**
     * Advanced date utilities for common operations
     */
    advanced: {
        /**
         * Get current date in user input format (today's date)
         * @returns Type-safe user input date string for today
         */
        today(): UserInputDateString {
            const now = typedDateUtils.now();
            return typedDateUtils.toUserInput(now);
        },

        /**
         * Get yesterday's date in user input format
         * @returns Type-safe user input date string for yesterday
         */
        yesterday(): UserInputDateString {
            const now = typedDateUtils.now();
            const yesterday = typedDateUtils.addDays(now, -1);
            return typedDateUtils.toUserInput(yesterday);
        },

        /**
         * Get tomorrow's date in user input format
         * @returns Type-safe user input date string for tomorrow
         */
        tomorrow(): UserInputDateString {
            const now = typedDateUtils.now();
            const tomorrow = typedDateUtils.addDays(now, 1);
            return typedDateUtils.toUserInput(tomorrow);
        },

        /**
         * Check if a database date is today
         * @param date - Database date to check
         * @returns True if the date is today
         */
        isToday(date: DatabaseDateString): boolean {
            const today = this.today();
            const dateAsUserInput = typedDateUtils.toUserInput(date);
            return dateAsUserInput === today;
        },

        /**
         * Get the start of day for a database date
         * @param date - Database date
         * @returns Database date at start of day (00:00:00.000Z)
         */
        startOfDay(date: DatabaseDateString): DatabaseDateString {
            dateTypeGuards.assertDatabaseDateString(date, 'date parameter');
            const parsed = DateTime.fromISO(date).toUTC().startOf('day');
            if (!parsed.isValid) {
                throw new Error(`Invalid date for start of day calculation: ${date}`);
            }
            const result = parsed.toISO();
            if (!result) {
                throw new Error(`Failed to calculate start of day for: ${date}`);
            }
            return dateTypeGuards.assertDatabaseDateString(result, 'start of day result') as DatabaseDateString;
        },

        /**
         * Get the end of day for a database date
         * @param date - Database date
         * @returns Database date at end of day (23:59:59.999Z)
         */
        endOfDay(date: DatabaseDateString): DatabaseDateString {
            dateTypeGuards.assertDatabaseDateString(date, 'date parameter');
            const parsed = DateTime.fromISO(date).toUTC().endOf('day');
            if (!parsed.isValid) {
                throw new Error(`Invalid date for end of day calculation: ${date}`);
            }
            const result = parsed.toISO();
            if (!result) {
                throw new Error(`Failed to calculate end of day for: ${date}`);
            }
            return dateTypeGuards.assertDatabaseDateString(result, 'end of day result') as DatabaseDateString;
        },

        /**
         * Get days between two database dates
         * @param startDate - Start database date
         * @param endDate - End database date
         * @returns Number of days between dates (negative if startDate is after endDate)
         */
        daysBetween(startDate: DatabaseDateString, endDate: DatabaseDateString): number {
            dateTypeGuards.assertDatabaseDateString(startDate, 'start date parameter');
            dateTypeGuards.assertDatabaseDateString(endDate, 'end date parameter');
            
            const start = DateTime.fromISO(startDate).toUTC().startOf('day');
            const end = DateTime.fromISO(endDate).toUTC().startOf('day');
            
            if (!start.isValid) {
                throw new Error(`Invalid start date for days calculation: ${startDate}`);
            }
            if (!end.isValid) {
                throw new Error(`Invalid end date for days calculation: ${endDate}`);
            }
            
            return Math.round(end.diff(start, 'days').days);
        },

        /**
         * Format database date for different display contexts
         * @param date - Database date
         * @param format - Display format type
         * @returns Formatted date string
         */
        formatForDisplay(
            date: DatabaseDateString, 
            format: 'short' | 'long' | 'iso' | 'relative'
        ): string {
            dateTypeGuards.assertDatabaseDateString(date, 'date parameter');
            const parsed = DateTime.fromISO(date);
            
            if (!parsed.isValid) {
                throw new Error(`Invalid date for formatting: ${date}`);
            }
            
            switch (format) {
                case 'short':
                    return parsed.toLocaleString(DateTime.DATE_SHORT); // "1/15/2024"
                case 'long':
                    return parsed.toLocaleString(DateTime.DATE_FULL); // "January 15, 2024"
                case 'iso':
                    return parsed.toISODate() || date.substring(0, 10); // "2024-01-15"
                case 'relative':
                    return parsed.toRelative() || 'unknown'; // "2 days ago"
                default:
                    throw new Error(`Unknown display format: ${format}`);
            }
        }
    }
} as const;

export const config = {
    // Supabase configuration
    supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },

    // Storage configuration (Supabase Storage)
    storage: {
        bucketName: 'transcripts',
        maxFileSize: 50 * 1024 * 1024, // 50MB to match bucket configuration
        allowedMimeTypes: [
            'application/json',
            'text/plain',
            'text/srt',
            'text/vtt',
            'application/octet-stream'
        ],
        // Public access setting depends on environment
        publicAccess: process.env.NODE_ENV === 'development',
    },

    // Legacy blob storage configuration (for migration reference)
    blob: {
        /**
         * Path prefix for transcript blobs
         * This allows for organizing blobs by type
         */
        transcriptPathPrefix: 'transcripts',

        /**
         * Maximum allowed transcript size in bytes
         * Default: 10MB (legacy - now 50MB in Supabase)
         */
        maxTranscriptSize: 10 * 1024 * 1024,

        /**
         * How long to store transcripts for
         * Default: 30 days (for development)
         * In production, you might set this to a longer period
         */
        expirationSeconds: 30 * 24 * 60 * 60,

        /**
         * Whether to allow public access to transcript blobs
         * Default: false (private access only)
         */
        allowPublicAccess: false,
    },

    // Processing configuration
    processing: {
        /**
         * Maximum segment size in tokens
         * This ensures segments fit within LLM context windows
         */
        maxSegmentTokens: 4000,

        /**
         * Overlap between segments in tokens
         * This provides context continuity between segments
         */
        segmentOverlapTokens: 200,

        /**
         * Whether to enable speaker-based segmentation
         * This splits segments at speaker boundaries when possible
         */
        enableSpeakerSegmentation: true,

        /**
         * Whether to enable semantic segmentation
         * This tries to split at topic boundaries
         */
        enableSemanticSegmentation: true,
    }
} as const;