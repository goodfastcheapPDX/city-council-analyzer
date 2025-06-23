# Date Formatting Standards - Single Source of Truth

## Overview

This document establishes the **single source of truth** for date handling across the entire transcript analysis system. All date operations must use the standardized utilities and formats defined in `src/lib/config.ts`.

## Format Standards

### 1. User Input Format: `YYYY-MM-DD`
- **Usage**: Form inputs, API requests, user-facing interfaces
- **Example**: `"2024-01-15"`
- **Validation**: Use `dateUtils.isValidUserInput()`

### 2. Database Storage Format: ISO 8601 with timezone
- **Usage**: PostgreSQL/Supabase storage, internal processing
- **Example**: `"2024-01-15T10:30:00.000Z"`
- **Generation**: Use `dateUtils.now()` or `dateUtils.toDatabase()`

### 3. API Response Format: ISO 8601 with timezone (same as database)
- **Usage**: REST API responses, JSON serialization
- **Example**: `"2024-01-15T10:30:00.000Z"`
- **Note**: Same as database format for consistency

### 4. Display Format: Human-readable
- **Usage**: User interfaces, reports, email notifications
- **Example**: `"January 15, 2024"`
- **Implementation**: Frontend formatting libraries

## Required Usage Patterns

### ✅ Correct Usage

```typescript
import { dateUtils } from '@/lib/config';

// Converting user input for database storage
const userDate = '2024-01-15';
const dbDate = dateUtils.toDatabase(userDate);

// Getting current timestamp
const now = dateUtils.now();

// Validating user input
if (dateUtils.isValidUserInput(userDate)) {
    // Process valid date
}

// Converting database response for user display
const displayDate = dateUtils.databaseToUserInput(dbResponse.date);
```

### ❌ Incorrect Usage

```typescript
// DON'T: Hardcode date formatting
const now = new Date().toISOString(); // Use dateUtils.now() instead

// DON'T: Manual date validation
if (/^\d{4}-\d{2}-\d{2}$/.test(date)) { // Use dateUtils.isValidUserInput() instead

// DON'T: Inconsistent format handling
const date = someDate.split('T')[0]; // Use dateUtils.databaseToUserInput() instead
```

## Implementation Locations

### Core Configuration
- **`src/lib/config.ts`**: Date utilities and format definitions
- **`src/__tests__/lib/config/date-utils.test.ts`**: Comprehensive date utility tests

### Validation Layer
- **`src/lib/utils/metadata-validation.ts`**: Uses `dateUtils.isValidUserInput()`
- **`src/app/api/transcripts/handlers.ts`**: Zod schema expects YYYY-MM-DD format

### Storage Layer
- **`src/lib/storage/blob.ts`**: Uses `dateUtils.now()` for timestamps
- **Database**: Stores ISO 8601 with timezone automatically

### Tests
- **All test files**: Use standardized date formats for consistency
- **Property-based tests**: Cover edge cases and format validation

## Benefits of Standardization

### 1. Consistency
- Uniform date handling across frontend, backend, and database
- Predictable behavior for developers and users
- Reduced bugs from format mismatches

### 2. Maintainability
- Single place to update date handling logic
- Centralized validation and conversion functions
- Easy to change formats if requirements evolve

### 3. Type Safety
- TypeScript types enforce correct usage patterns
- Compile-time errors for format violations
- Clear interfaces for date-related operations

### 4. Testing
- Comprehensive test coverage for all date operations
- Property-based testing for edge cases
- Integration tests verify end-to-end consistency

## Migration Strategy

### Phase 1: Core Infrastructure ✅ COMPLETED
- [x] Establish date utilities in `src/lib/config.ts`
- [x] Update metadata validation to use standardized utilities
- [x] Update storage layer to use `dateUtils.now()`
- [x] Create comprehensive test suite for date utilities

### Phase 2: API Layer
- [ ] Ensure all API endpoints use consistent date formats
- [ ] Add date format documentation to API specs
- [ ] Update error messages to reference standard formats

### Phase 3: Frontend Integration
- [ ] Update frontend components to use date utilities
- [ ] Implement display formatting for user interfaces
- [ ] Add client-side validation using shared utilities

### Phase 4: Documentation and Training
- [ ] Update developer documentation
- [ ] Create examples and best practices guide
- [ ] Establish code review guidelines for date handling

## Validation Rules

### User Input Validation
- Must match exactly: `/^\d{4}-\d{2}-\d{2}$/`
- Must be a valid calendar date (no Feb 30, etc.)
- Must be parseable by JavaScript Date constructor
- Use `dateUtils.isValidUserInput()` for validation

### Database Storage Requirements
- Always store as ISO 8601 with timezone: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Use UTC timezone for consistency
- Preserve millisecond precision for audit trails
- Use `dateUtils.now()` for current timestamps

### API Response Standards
- Return dates in database format (ISO 8601 with timezone)
- Include timezone information for client-side handling
- Maintain consistency between request and response formats
- Document expected formats in API specifications

## Troubleshooting

### Common Issues
1. **Date parsing errors**: Ensure input matches expected format
2. **Timezone discrepancies**: Always use UTC for storage, convert for display
3. **Validation failures**: Use `dateUtils.isValidUserInput()` for pre-validation
4. **Format inconsistencies**: Always use utility functions, never manual formatting

### Debugging Tools
- `dateUtils.isValidUserInput()`: Validate user input format
- `dateUtils.toDatabase()`: Convert any date input to database format
- `dateUtils.databaseToUserInput()`: Extract date part from database response
- Test suite: `npm test src/__tests__/lib/config/date-utils.test.ts`

## Future Considerations

### Internationalization
- Current standard uses UTC and ISO 8601
- Future: Add locale-specific display formatting
- Consider user timezone preferences for display

### Database Optimization
- Current: PostgreSQL TIMESTAMPTZ handles timezone conversion
- Monitor performance for large-scale date queries
- Consider indexing strategies for temporal data

### API Evolution
- Maintain backward compatibility for existing clients
- Version API endpoints if date format changes required
- Provide migration guides for breaking changes

---

**Remember**: Always import and use `dateUtils` from `@/lib/config` for any date-related operations. This ensures consistency and maintainability across the entire application stack.