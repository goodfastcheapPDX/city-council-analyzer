# Date Handling Guide

This guide provides comprehensive documentation for date handling in the City Council Analyzer project. All date operations should follow these standardized practices to ensure consistency, type safety, and maintainability.

## Overview

The project uses a comprehensive date standardization system with three main components:
1. **ESLint rules** - Prevent direct Date usage and enforce dateUtils
2. **TypeScript branded types** - Compile-time type safety for different date formats
3. **Runtime validation** - Type guards and utility functions for safe date operations

## Quick Start

### ✅ Correct Usage
```typescript
import { dateUtils, typedDateUtils } from '@/lib/config';

// Get current timestamp
const now = dateUtils.now(); // Returns ISO string

// Convert user input to database format
const userDate = "2024-01-15";
const dbDate = dateUtils.userInputToDatabase(userDate);

// Type-safe operations
const typedDbDate = typedDateUtils.now(); // Returns DatabaseDateString
const displayDate = typedDateUtils.toDisplay(typedDbDate); // Returns DisplayDateString
```

### ❌ Incorrect Usage (Will Trigger ESLint Errors)
```typescript
// These will cause ESLint errors:
const now = new Date(); // ❌ Use dateUtils.now() instead
const timestamp = Date.now(); // ❌ Use dateUtils.now() instead
const formatted = date.toISOString(); // ❌ Use dateUtils methods instead

// These will cause TypeScript errors:
const mixed: DatabaseDateString = "2024-01-15"; // ❌ Wrong format
const invalid = dbDate + userDate; // ❌ Can't mix date types
```

## Date Format Standards

### 1. DatabaseDateString
- **Format:** ISO 8601 with timezone (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Usage:** Database storage, API responses, internal processing
- **Example:** `"2024-01-15T10:30:00.000Z"`
- **Brand:** `DatabaseDateString`

### 2. UserInputDateString  
- **Format:** Simple date (`YYYY-MM-DD`)
- **Usage:** Form inputs, API parameters, user-facing dates
- **Example:** `"2024-01-15"`
- **Brand:** `UserInputDateString`

### 3. DisplayDateString
- **Format:** Human-readable (`MMMM DD, YYYY`)
- **Usage:** UI display, reports, user-facing text
- **Example:** `"January 15, 2024"`
- **Brand:** `DisplayDateString`

## ESLint Rules

The project enforces date standards through ESLint rules that prevent common violations:

### Prevented Patterns
- `new Date()` - Use `dateUtils.now()` instead
- `Date.now()` - Use `dateUtils.now()` instead  
- `Date.parse()` - Use `dateUtils` methods instead
- Importing moment, date-fns, dayjs, luxon directly - Use `dateUtils` wrapper

### Error Messages
ESLint provides helpful error messages pointing to the correct alternatives:

```
Error: Avoid 'new Date()' constructor. Use dateUtils.now() for current time or dateUtils.toDatabase() for parsing dates.
Error: Avoid 'Date.now()'. Use dateUtils.now() for consistent timestamp generation.
```

### Configuration Location
- File: `eslint.config.mjs`
- Rules: `no-restricted-syntax`, `no-restricted-globals`, `no-restricted-imports`

## TypeScript Type Safety

### Branded Types
Branded types prevent mixing different date formats at compile time:

```typescript
// These types are mutually exclusive
type DatabaseDateString = string & { __brand: 'DatabaseDate' };
type UserInputDateString = string & { __brand: 'UserInputDate' };
type DisplayDateString = string & { __brand: 'DisplayDate' };
```

### Type Guards
Runtime validation with detailed error messages:

```typescript
import { dateTypeGuards } from '@/lib/config';

// Validate and cast unknown values
const dbDate = dateTypeGuards.assertDatabaseDateString(value, 'API response');
const userDate = dateTypeGuards.assertUserInputDateString(input, 'form field');
const displayDate = dateTypeGuards.assertDisplayDateString(text, 'UI display');

// Type predicates for conditional logic
if (dateTypeGuards.isDatabaseDateString(value)) {
    // value is now typed as DatabaseDateString
    console.log('Valid database date:', value);
}
```

### Utility Types
Additional compile-time safety utilities:

```typescript
// Require specific date types
function processDbDate<T extends DatabaseDateString>(date: T): T {
    return date;
}

// Extract metadata from branded types
type Brand = ExtractDateBrand<DatabaseDateString>; // 'DatabaseDate'
type Format = ExtractDateFormat<UserInputDateString>; // 'YYYY-MM-DD'
```

## Core API Reference

### dateUtils (Basic Operations)

#### Current Time
```typescript
const now = dateUtils.now(); // Current timestamp in database format
```

#### Format Conversions
```typescript
// User input to database
const dbDate = dateUtils.userInputToDatabase("2024-01-15");

// Database to user input
const userDate = dateUtils.databaseToUserInput("2024-01-15T10:30:00.000Z");

// Database to display
const displayDate = dateUtils.toUserDisplay("2024-01-15T10:30:00.000Z");
```

#### Validation
```typescript
// Validate user input format
const isValid = dateUtils.isValidUserInput("2024-01-15"); // true

// Convert any date input to database format
const dbDate = dateUtils.toDatabase(new Date()); // Handles Date objects
const dbDate2 = dateUtils.toDatabase("2024-01-15"); // Handles user input
```

#### Date Operations
```typescript
// Comparisons
const isBefore = dateUtils.isBefore(date1, date2);
const isAfter = dateUtils.isAfter(date1, date2);

// Arithmetic
const futureDate = dateUtils.addDays(currentDate, 7);

// Timezone conversion
const localTime = dateUtils.convertTimezone(utcDate, 'America/New_York');
```

### typedDateUtils (Type-Safe Operations)

#### Type-Safe Conversions
```typescript
// All operations return properly branded types
const dbDate: DatabaseDateString = typedDateUtils.now();
const userDate: UserInputDateString = typedDateUtils.toUserInput(dbDate);
const displayDate: DisplayDateString = typedDateUtils.toDisplay(dbDate);
```

#### Validation and Casting
```typescript
// Validate and cast unknown values
const safeDbDate = typedDateUtils.casting.toDatabaseDateString(unknownValue);
const safeUserDate = typedDateUtils.casting.toUserInputDateString(formInput);

// Validate user input
const validatedInput = typedDateUtils.validateUserInput(userInput);
```

#### Advanced Operations
```typescript
// Date calculations with type safety
const tomorrow = typedDateUtils.advanced.tomorrow();
const yesterday = typedDateUtils.advanced.yesterday();
const isToday = typedDateUtils.advanced.isToday(dbDate);

// Start/end of day
const dayStart = typedDateUtils.advanced.startOfDay(dbDate);
const dayEnd = typedDateUtils.advanced.endOfDay(dbDate);

// Days between dates
const dayCount = typedDateUtils.advanced.daysBetween(startDate, endDate);

// Flexible formatting
const formatted = typedDateUtils.advanced.formatForDisplay(dbDate, 'short');
```

## Testing Patterns

### Property-Based Testing
Use Fast-Check for comprehensive date testing:

```typescript
import * as fc from 'fast-check';
import { dateUtils } from '@/lib/config';

// Test date conversion properties
fc.assert(fc.property(
    fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
    (date) => {
        const dbDate = dateUtils.toDatabase(date);
        const parsed = new Date(dbDate);
        expect(parsed.getTime()).toBe(date.getTime());
    }
));
```

### Deterministic Test Dates
Use `dateUtils.testDate()` for consistent test results:

```typescript
// Deterministic test dates
const testDate = dateUtils.testDate('2024-01-15T10:30:00.000Z');
const testUserDate = typedDateUtils.advanced.today(); // Uses current date

// Test date utilities
const testDates = {
    deterministic: () => dateUtils.testDate('2024-01-15T10:30:00.000Z'),
    today: () => typedDateUtils.advanced.today(),
    yesterday: () => typedDateUtils.advanced.yesterday(),
    tomorrow: () => typedDateUtils.advanced.tomorrow()
};
```

## Common Patterns

### API Endpoint Implementation
```typescript
// API route handler
export async function POST(request: Request) {
    const { date } = await request.json();
    
    // Validate user input
    const userDate = typedDateUtils.validateUserInput(date);
    
    // Convert to database format
    const dbDate = typedDateUtils.fromUserInput(userDate);
    
    // Store in database
    await store({ created_at: dbDate });
    
    return Response.json({ success: true });
}
```

### Database Operations
```typescript
// Database query with proper date handling
const transcript = await supabase
    .from('transcripts')
    .select('*')
    .eq('date', typedDateUtils.fromUserInput(userInputDate))
    .single();

// Process database response
if (transcript.data) {
    const dbDate = typedDateUtils.casting.toDatabaseDateString(
        transcript.data.created_at, 
        'database response'
    );
    const displayDate = typedDateUtils.toDisplay(dbDate);
}
```

### Form Handling
```typescript
// React component with date input
function TranscriptForm() {
    const [date, setDate] = useState<string>('');
    
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        
        try {
            // Validate user input
            const validatedDate = typedDateUtils.validateUserInput(date);
            
            // Submit with proper format
            onSubmit({ date: validatedDate });
        } catch (error) {
            setError(error.message); // Clear error message from type guard
        }
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="YYYY-MM-DD"
            />
        </form>
    );
}
```

## Error Handling

### Type Guard Errors
Type guards provide detailed error messages with context:

```typescript
try {
    const dbDate = dateTypeGuards.assertDatabaseDateString(value, 'API response');
} catch (error) {
    // Error message includes context and expected format:
    // "Invalid API response: "2024-01-15" is not a valid DatabaseDateString. 
    //  Expected ISO 8601 format with timezone (e.g., "2024-01-15T10:30:00.000Z")"
}
```

### Conversion Errors
Date utility functions provide specific error messages:

```typescript
try {
    const dbDate = dateUtils.userInputToDatabase('invalid-date');
} catch (error) {
    // Error message: "Invalid user input date: invalid-date. Expected format: YYYY-MM-DD"
}
```

### Validation Errors
Validation functions help identify specific issues:

```typescript
if (!dateUtils.isValidUserInput(userInput)) {
    throw new Error(`Invalid date format: "${userInput}". Please use YYYY-MM-DD format.`);
}
```

## Migration Guide

### From Direct Date Usage
```typescript
// Old (will cause ESLint errors)
const now = new Date();
const timestamp = Date.now();

// New (correct approach)
const now = dateUtils.now();
const timestamp = dateUtils.now();
```

### From String Concatenation
```typescript
// Old (error-prone)
const dateString = year + '-' + month + '-' + day;

// New (type-safe)
const userDate = typedDateUtils.validateUserInput(`${year}-${month}-${day}`);
```

### From Manual Parsing
```typescript
// Old (inconsistent)
const parsed = new Date(dateString);
const iso = parsed.toISOString();

// New (standardized)
const dbDate = dateUtils.toDatabase(dateString);
```

## Troubleshooting

### Common ESLint Errors

**Error:** "Avoid 'new Date()' constructor"
- **Solution:** Use `dateUtils.now()` for current time or `dateUtils.toDatabase()` for parsing

**Error:** "Avoid importing 'moment' directly"
- **Solution:** Use `dateUtils` methods which provide Luxon-backed functionality

### Common TypeScript Errors

**Error:** Type 'string' is not assignable to type 'DatabaseDateString'
- **Solution:** Use type guards or `typedDateUtils.casting` methods

**Error:** Cannot mix different branded date types
- **Solution:** Convert between types using `typedDateUtils.conversion` methods

### Runtime Validation Errors

**Error:** "Invalid database date format"
- **Check:** Ensure the date includes timezone information (Z or ±HH:mm)
- **Fix:** Use `dateUtils.toDatabase()` to convert from other formats

**Error:** "Invalid user input date"
- **Check:** Ensure the date follows YYYY-MM-DD format exactly
- **Fix:** Validate input with `typedDateUtils.isValidUserInputDate()`

## Performance Considerations

### Caching
- Type guard validations include format checking which can be expensive
- Consider caching validation results for frequently accessed dates
- Use `dateUtils.isValidUserInput()` for quick format checks before full validation

### Memory Usage
- Branded types have no runtime overhead - they're compile-time only
- Type guards create minimal overhead compared to parsing operations
- Luxon operations are generally efficient but avoid unnecessary conversions

### Best Practices
- Validate dates once at system boundaries (API inputs, database responses)
- Store validated dates in properly typed variables to avoid re-validation
- Use the most specific type possible (`UserInputDateString` vs `string`)
- Prefer `typedDateUtils` for operations requiring type safety guarantees

## IDE Integration

### VS Code Settings
Add these settings for better developer experience:

```json
{
    "typescript.preferences.includePackageJsonAutoImports": "auto",
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    },
    "eslint.validate": ["typescript", "typescriptreact"]
}
```

### Auto-Import Configuration
The branded types and utilities are exported from `@/lib/config`:

```typescript
import { 
    dateUtils, 
    typedDateUtils, 
    dateTypeGuards,
    type DatabaseDateString,
    type UserInputDateString,
    type DisplayDateString 
} from '@/lib/config';
```

## Summary

This date handling system provides:
- **Compile-time safety** through branded types
- **Runtime validation** through type guards  
- **Consistent formatting** through standardized utilities
- **Clear error messages** for debugging and development
- **ESLint enforcement** to prevent violations
- **Comprehensive testing** support with property-based testing

Always use the provided `dateUtils` and `typedDateUtils` instead of native Date operations to ensure consistency and type safety throughout the application.