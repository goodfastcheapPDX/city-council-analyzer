# Test-Driven Development Implementation Guide

## Overview

This document provides practical guidance for implementing Test-Driven Development (TDD) in the transcript analysis system, building on the principles defined in `claude/rules/test-driven-development.md`.

## TDD Workflow Process

### 1. Before Starting Any Feature

**Step 1: Understand the Requirement**
- Read user story or requirement carefully
- Identify the expected behavior and outcomes
- Understand the business value and user impact

**Step 2: Create a Todo List**
```bash
# Use TodoWrite tool to plan the feature
# Break down into testable behaviors
# Prioritize by dependencies and importance
```

**Step 3: Write First Failing Test**
- Focus on ONE specific behavior
- Use descriptive test name: "should [behavior] when [condition]"
- Add business rationale comment explaining WHY this test matters
- Ensure test fails for the right reason

### 2. Red-Green-Refactor Cycle

#### Red Phase: Write Failing Test
```typescript
describe('TranscriptValidator', () => {
  it('should reject transcript when title field is missing', async () => {
    // This test ensures our validation prevents incomplete transcript uploads,
    // which is critical for maintaining data quality and preventing downstream
    // processing errors that would frustrate users and waste system resources.
    
    const invalidTranscript = {
      date: '2024-01-15',
      speakers: ['Speaker 1'],
      content: 'Meeting content...'
      // Missing required title field
    };

    const result = await validateTranscript(invalidTranscript);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'title',
      message: 'Title is required'
    });
  });
});
```

**Validation Checklist for Red Phase:**
- [ ] Test name describes specific behavior
- [ ] Business rationale comment included
- [ ] Test focuses on behavior, not implementation
- [ ] Test fails for the expected reason
- [ ] Assertions are specific and meaningful

#### Green Phase: Make Test Pass
```typescript
// Write MINIMAL code to make test pass
export function validateTranscript(transcript: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!transcript.title) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**Validation Checklist for Green Phase:**
- [ ] Code does only what current test requires
- [ ] No speculative features implemented
- [ ] Test passes
- [ ] No other tests broken

#### Refactor Phase: Improve Code Quality
```typescript
// After test passes, improve implementation
import { z } from 'zod';

const TranscriptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  speakers: z.array(z.string()).min(1, 'At least one speaker required'),
  content: z.string().min(1, 'Content is required')
});

export function validateTranscript(transcript: any): ValidationResult {
  const result = TranscriptSchema.safeParse(transcript);
  // ... implementation using Zod
}
```

**Validation Checklist for Refactor Phase:**
- [ ] All tests still pass
- [ ] Code quality improved
- [ ] No new functionality added
- [ ] Performance maintained or improved

### 3. Property-Based Testing Integration

For complex validation logic, add property-based tests:

```typescript
import * as fc from 'fast-check';

it('should handle any string input for title validation consistently', () => {
  // This property test ensures title validation behaves consistently across
  // all possible string inputs, preventing edge cases that could cause
  // system crashes or allow invalid data through validation.
  
  fc.assert(
    fc.property(
      fc.string(),
      (titleInput) => {
        const transcript = {
          title: titleInput,
          date: '2024-01-15',
          speakers: ['Speaker'],
          content: 'Content'
        };

        const result = validateTranscript(transcript);

        // Should always return a boolean
        expect(typeof result.isValid).toBe('boolean');
        
        // Empty or whitespace-only titles should be invalid
        if (!titleInput || titleInput.trim().length === 0) {
          expect(result.isValid).toBe(false);
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

## Quality Standards Enforcement

### Test Quality Checklist

Before merging any code, verify:

**Test Structure:**
- [ ] Test name clearly describes expected behavior
- [ ] Business rationale comment explains importance
- [ ] Arrange-Act-Assert pattern followed
- [ ] Test is independent and can run in isolation

**Test Coverage:**
- [ ] Happy path tested
- [ ] Edge cases covered
- [ ] Error conditions validated
- [ ] Property-based tests for complex logic

**Implementation Quality:**
- [ ] Minimal code to pass tests
- [ ] No untested functionality
- [ ] Clean, readable code
- [ ] Performance meets requirements

### Automated Validation

Add these commands to validate TDD adherence:

```bash
# Run tests with coverage
npm run test:coverage

# Ensure minimum coverage (80%)
# Should fail if coverage drops below threshold

# Run property-based tests specifically
npm test -- --grep "Property-Based"

# Validate test descriptions
npm test -- --reporter=verbose | grep -E "(should|when|if)"
```

## Common TDD Anti-Patterns to Avoid

### ❌ Writing Tests After Implementation
```typescript
// BAD: Test written to match existing code
it('should call parseJSON method', () => {
  const parser = new TranscriptParser();
  const spy = jest.spyOn(parser, 'parseJSON');
  parser.parse('{"content": "test"}', 'json');
  expect(spy).toHaveBeenCalled(); // Testing implementation
});
```

### ✅ Behavior-Driven Test First
```typescript
// GOOD: Test describes expected behavior
it('should extract content from valid JSON transcript', () => {
  // This test ensures our parser correctly processes JSON format transcripts,
  // which is essential for supporting various transcript upload formats and
  // maintaining consistent data extraction across input types.
  
  const parser = new TranscriptParser();
  const jsonInput = '{"content": "Meeting discussion", "speakers": ["Mayor"]}';
  
  const result = parser.parse(jsonInput, 'json');
  
  expect(result.content).toBe('Meeting discussion');
  expect(result.speakers).toEqual(['Mayor']);
});
```

### ❌ Over-Implementation Before Tests
```typescript
// BAD: Complex implementation without tests
export class TranscriptProcessor {
  async process(transcript: RawTranscript): Promise<ProcessedTranscript> {
    // 50 lines of untested complex logic
    const normalized = this.normalize(transcript);
    const validated = this.validate(normalized);
    const segmented = this.segment(validated);
    // ... more untested methods
  }
}
```

### ✅ Test-Driven Implementation
```typescript
// GOOD: Start with simple test
it('should preserve original content during processing', async () => {
  // This test ensures processing never loses or corrupts original transcript
  // content, which is fundamental for maintaining user trust and data integrity.
  
  const processor = new TranscriptProcessor();
  const input = { content: 'Original content', title: 'Meeting' };
  
  const result = await processor.process(input);
  
  expect(result.originalContent).toBe('Original content');
});

// Then implement minimal code to pass
export class TranscriptProcessor {
  async process(transcript: RawTranscript): Promise<ProcessedTranscript> {
    return {
      originalContent: transcript.content,
      // ... add more fields as tests require
    };
  }
}
```

## Integration with Project Workflow

### Git Commit Process

1. **Write failing test** → Commit with message: "test: add validation for missing title field"
2. **Make test pass** → Commit with message: "feat: implement title validation"
3. **Refactor if needed** → Commit with message: "refactor: improve validation using Zod schema"

### Code Review Standards

Reviewers should verify:
- [ ] Tests written before implementation
- [ ] Test names describe behavior clearly
- [ ] Business rationale comments present
- [ ] Property-based tests for complex logic
- [ ] No untested code paths
- [ ] Coverage meets 80% minimum

### Continuous Integration

CI pipeline should:
1. Run all tests with coverage reporting
2. Fail if coverage drops below 80%
3. Run property-based tests with sufficient iterations
4. Validate test descriptions follow naming conventions
5. Check for TDD anti-patterns in code review

## Measuring TDD Success

### Metrics to Track

**Code Quality:**
- Test coverage percentage (target: 80%+)
- Number of property-based tests
- Test description quality score
- Bug escape rate to production

**Process Adherence:**
- Percentage of commits with tests first
- Average time between test and implementation commits
- Code review feedback on TDD practices

**Business Impact:**
- Reduced bug reports from users
- Faster feature development cycles
- Improved developer confidence in changes
- Decreased debugging time

This guide ensures our TDD implementation maintains high quality standards while supporting rapid, reliable feature development.