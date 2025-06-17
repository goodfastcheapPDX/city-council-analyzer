# Test-Driven Development Guidelines

## Purpose
This rule establishes Test-Driven Development (TDD) as the primary development methodology for this project, emphasizing behavior specification through tests before implementation.

## When to Apply
Apply this rule when:
- Starting any new feature or component implementation
- Adding new functionality to existing code
- Fixing bugs (write failing test first, then fix)
- Refactoring code (tests ensure behavior preservation)
- User requests new functionality or improvements

## Core TDD Principles

### 1. Red-Green-Refactor Cycle
**Always follow this sequence:**
1. **Red**: Write a failing test that specifies desired behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Improve code quality while keeping tests green

### 2. Behavior Specification First
- Tests define **what** the system should do, not **how**
- Write tests that describe business requirements
- Use descriptive test names that read like specifications
- Focus on observable behavior and outcomes

### 3. Minimal Implementation
- Write only enough code to make the current test pass
- Resist the urge to implement features not yet tested
- Let tests drive the design, not assumptions

### 4. Comprehensive Test Coverage
- Test happy paths, edge cases, and error conditions
- Use property-based testing for thorough edge case coverage
- Test integration points and external dependencies

### 5. Test Rationale Documentation
- Include comments explaining **why** each test is important
- Describe the business value and consequences of the behavior being tested
- Connect test purpose to system requirements and user needs
- Help future developers understand the intent behind each test

## Good TDD Examples

### ✅ Example 1: Transcript Validation

**Step 1: Write Failing Test (Red)**
```typescript
// src/lib/validation/__tests__/transcript-validator.test.ts
import { validateTranscript } from '../transcript-validator';
import * as fc from 'fast-check';

describe('TranscriptValidator', () => {
  describe('validateTranscript', () => {
    it('should accept valid transcript with required fields', () => {
      // This test ensures our validator correctly identifies valid transcripts,
      // which is critical for preventing rejection of legitimate uploads and
      // maintaining user confidence in the system.
      const validTranscript = {
        title: 'City Council Meeting',
        date: '2024-01-15',
        speakers: ['Mayor Johnson', 'Council Member Smith'],
        content: 'Meeting content here...'
      };

      const result = validateTranscript(validTranscript);

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject transcript with missing title', () => {
      // This test verifies that missing required fields are caught early,
      // preventing incomplete data from entering our processing pipeline
      // and causing downstream failures or corrupted analysis results.
      const invalidTranscript = {
        date: '2024-01-15',
        speakers: ['Mayor Johnson'],
        content: 'Meeting content here...'
      };

      const result = validateTranscript(invalidTranscript);

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required'
      });
    });

    it('should reject transcript with invalid date format', () => {
      // This property-based test ensures our system handles malformed dates
      // gracefully, which is essential for data integrity and preventing
      // temporal analysis errors in our AI processing pipeline.
      fc.assert(
        fc.property(
          fc.string().filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
          (invalidDate) => {
            const transcript = {
              title: 'Meeting',
              date: invalidDate,
              speakers: ['Speaker'],
              content: 'Content'
            };

            const result = validateTranscript(transcript);

            expect(result.success).toBe(false);
            expect(result.errors.some(e => e.field === 'date')).toBe(true);
          }
        )
      );
    });
  });
});
```

**Step 2: Minimal Implementation (Green)**
```typescript
// src/lib/validation/transcript-validator.ts
interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
}

export function validateTranscript(transcript: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!transcript.title) {
    errors.push({ field: 'title', message: 'Title is required' });
  }

  if (!transcript.date || !/^\d{4}-\d{2}-\d{2}$/.test(transcript.date)) {
    errors.push({ field: 'date', message: 'Date must be in YYYY-MM-DD format' });
  }

  return {
    success: errors.length === 0,
    errors
  };
}
```

**Step 3: Refactor (Improve)**
```typescript
// After tests pass, refactor for better design
import { z } from 'zod';

const TranscriptSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  speakers: z.array(z.string()).min(1, 'At least one speaker required'),
  content: z.string().min(1, 'Content is required')
});

export function validateTranscript(transcript: any): ValidationResult {
  const result = TranscriptSchema.safeParse(transcript);
  
  if (result.success) {
    return { success: true, errors: [] };
  }

  return {
    success: false,
    errors: result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
  };
}
```

### ✅ Example 2: Token Counting Service

**Step 1: Behavior Specification (Red)**
```typescript
// src/lib/tokens/__tests__/token-counter.test.ts
import { TokenCounter } from '../token-counter';
import * as fc from 'fast-check';

describe('TokenCounter', () => {
  let tokenCounter: TokenCounter;

  beforeEach(() => {
    tokenCounter = new TokenCounter();
  });

  describe('count', () => {
    it('should return accurate token count for simple text', async () => {
      // This test verifies that token counting produces valid results,
      // which is crucial for cost estimation and LLM request planning
      // in our AI processing pipeline.
      const text = 'Hello world, this is a test.';
      
      const result = await tokenCounter.count(text);
      
      expect(result.count).toBeGreaterThan(0);
      expect(result.method).toBe('tiktoken');
      expect(typeof result.count).toBe('number');
    });

    it('should handle empty strings', async () => {
      // This edge case test ensures our system gracefully handles empty content,
      // preventing division-by-zero errors or incorrect cost calculations
      // when processing minimal or filtered transcript segments.
      const result = await tokenCounter.count('');
      
      expect(result.count).toBe(0);
    });

    it('should provide fast estimation when requested', async () => {
      // This performance test ensures our estimation mode meets speed requirements
      // for real-time user feedback during transcript upload and preview,
      // where exact token counts aren't required but speed is critical.
      const text = 'A'.repeat(1000);
      const startTime = Date.now();
      
      const result = await tokenCounter.estimate(text);
      const duration = Date.now() - startTime;
      
      expect(result.method).toBe('estimated');
      expect(duration).toBeLessThan(100); // <100ms requirement
      expect(result.count).toBeGreaterThan(0);
    });

    it('should cache results for identical content', async () => {
      // This test validates our caching mechanism, which is essential for
      // performance optimization when processing large transcripts with
      // repeated content or when users re-upload similar files.
      const text = 'Cacheable content for testing';
      
      const first = await tokenCounter.count(text);
      const second = await tokenCounter.count(text);
      
      expect(second.method).toBe('cached');
      expect(second.count).toBe(first.count);
    });

    it('should always return non-negative counts', () => {
      // This property-based test ensures mathematical consistency across all inputs,
      // preventing negative token counts that would break cost calculations
      // and pipeline logic throughout our system.
      fc.assert(
        fc.property(fc.string(), async (text) => {
          const result = await tokenCounter.count(text);
          expect(result.count).toBeGreaterThanOrEqual(0);
        })
      );
    });
  });
});
```

**Step 2: Minimal Implementation**
```typescript
// src/lib/tokens/token-counter.ts
interface TokenCountResult {
  count: number;
  method: 'tiktoken' | 'estimated' | 'cached';
  timestamp: Date;
}

export class TokenCounter {
  private cache = new Map<string, number>();

  async count(text: string): Promise<TokenCountResult> {
    if (text === '') {
      return { count: 0, method: 'tiktoken', timestamp: new Date() };
    }

    // Check cache first
    if (this.cache.has(text)) {
      return {
        count: this.cache.get(text)!,
        method: 'cached',
        timestamp: new Date()
      };
    }

    // Simple approximation for now (will be replaced with tiktoken)
    const count = Math.ceil(text.split(/\s+/).length * 1.3);
    this.cache.set(text, count);

    return { count, method: 'tiktoken', timestamp: new Date() };
  }

  async estimate(text: string): Promise<TokenCountResult> {
    const count = Math.ceil(text.length / 4); // Rough estimation
    return { count, method: 'estimated', timestamp: new Date() };
  }
}
```

## Bad TDD Examples (What Not to Do)

### ❌ Example 1: Implementation-Driven Tests

**Bad Practice: Writing tests after implementation**
```typescript
// This is NOT TDD - test written to match existing implementation
describe('TranscriptParser', () => {
  it('should call parseJSON method when format is json', () => {
    const parser = new TranscriptParser();
    const spy = jest.spyOn(parser, 'parseJSON');
    
    parser.parse('{"content": "test"}', 'json');
    
    expect(spy).toHaveBeenCalled(); // Testing implementation, not behavior
  });
});
```

**Why this is bad:**
- Tests implementation details, not behavior
- Brittle - breaks when refactoring internal methods
- Provides no specification of what the system should do
- Written after code exists, not driving design

**Better approach:**
```typescript
describe('TranscriptParser', () => {
  it('should extract content and metadata from JSON transcript', () => {
    // This test verifies that our parser correctly extracts structured data
    // from JSON transcripts, ensuring reliable data flow into our analysis
    // pipeline regardless of the specific parsing implementation used.
    const parser = new TranscriptParser();
    const jsonInput = {
      content: 'Meeting discussion...',
      speakers: ['Mayor', 'Council Member'],
      date: '2024-01-15'
    };
    
    const result = parser.parse(JSON.stringify(jsonInput), 'json');
    
    expect(result.content).toBe('Meeting discussion...');
    expect(result.speakers).toEqual(['Mayor', 'Council Member']);
    expect(result.date).toBe('2024-01-15');
  });
});
```

### ❌ Example 2: Over-Implementation Before Tests

**Bad Practice: Writing complex implementation without tests**
```typescript
// Complex implementation written before any tests
export class TranscriptProcessor {
  async process(transcript: RawTranscript): Promise<ProcessedTranscript> {
    // 50 lines of complex logic without any tests guiding the design
    const normalized = this.normalize(transcript);
    const validated = this.validate(normalized);
    const segmented = this.segment(validated);
    const tokenCounted = this.countTokens(segmented);
    const embedded = await this.generateEmbeddings(tokenCounted);
    
    return this.assembleResult(embedded);
  }
  
  private normalize(transcript: RawTranscript) {
    // Complex normalization logic
  }
  
  // More private methods...
}
```

**Why this is bad:**
- No tests to verify behavior works correctly
- Complex design not driven by actual requirements
- Difficult to test after the fact
- High chance of bugs and design issues

**Better approach - TDD:**
```typescript
describe('TranscriptProcessor', () => {
  it('should preserve original content during processing', async () => {
    // This fundamental test ensures that our processing pipeline never
    // loses or corrupts the original transcript content, which is critical
    // for maintaining data integrity and user trust in the system.
    const processor = new TranscriptProcessor();
    const input: RawTranscript = {
      content: 'Original meeting content',
      title: 'Meeting',
      date: '2024-01-15'
    };
    
    const result = await processor.process(input);
    
    expect(result.originalContent).toBe('Original meeting content');
    expect(result.metadata.title).toBe('Meeting');
  });
});

// Then implement minimal code to pass, then add more tests iteratively
```

### ❌ Example 3: Vague Test Descriptions

**Bad Practice: Unclear test names and assertions**
```typescript
describe('SegmentationService', () => {
  it('should work correctly', () => {
    const service = new SegmentationService();
    const result = service.segment('some text');
    expect(result).toBeTruthy(); // Meaningless assertion
  });

  it('should handle input', () => {
    // What kind of input? What should happen?
    const service = new SegmentationService();
    const result = service.segment('input');
    expect(result.length).toBeGreaterThan(0); // Vague expectation
  });
});
```

**Why this is bad:**
- Test names don't describe expected behavior
- Assertions are too vague to be meaningful
- No clear specification of what the system should do
- Tests don't serve as documentation

**Better approach:**
```typescript
describe('SegmentationService', () => {
  it('should split transcript into segments at speaker boundaries', () => {
    // This test verifies that our segmentation correctly identifies speaker
    // changes, which is fundamental for accurate attribution and analysis
    // of who said what in city council proceedings.
    const service = new SegmentationService();
    const transcript = 'Mayor: Welcome everyone. Council Member: Thank you.';
    
    const segments = service.segment(transcript);
    
    expect(segments).toHaveLength(2);
    expect(segments[0].speaker).toBe('Mayor');
    expect(segments[0].text).toBe('Welcome everyone.');
    expect(segments[1].speaker).toBe('Council Member');
    expect(segments[1].text).toBe('Thank you.');
  });

  it('should respect token limits when creating segments', () => {
    // This test ensures our segmentation stays within LLM token limits,
    // preventing API errors and ensuring consistent processing costs
    // across transcripts of varying lengths.
    const service = new SegmentationService({ maxTokens: 10 });
    const longText = 'word '.repeat(20); // Creates text exceeding token limit
    
    const segments = service.segment(longText);
    
    segments.forEach(segment => {
      expect(segment.tokenCount).toBeLessThanOrEqual(10);
    });
  });
});
```

## TDD Implementation Guidelines

### Test Writing Process
1. **Write test name first** - describe the behavior in plain English
2. **Write rationale comment** - explain why this test matters
3. **Define expected inputs and outputs** - what should happen?
4. **Write assertions** - verify the specific behavior
5. **Run test (should fail)** - red phase
6. **Write minimal implementation** - just enough to pass
7. **Run test (should pass)** - green phase
8. **Refactor if needed** - improve code quality

### Writing Effective Test Rationale Comments
Each test should include a comment that explains:
- **Business importance**: Why this behavior matters to users or the system
- **Consequences of failure**: What goes wrong if this test fails
- **Context within system**: How this relates to broader functionality
- **Edge case significance**: Why this particular scenario needs testing

**Good rationale comment structure:**
```typescript
// This test ensures [specific behavior], which is [important because].
// [Consequence] if this fails, [affecting] [users/system/data integrity].
```

### Test Quality Checklist
- [ ] Test name clearly describes expected behavior
- [ ] Test includes comment explaining rationale and importance
- [ ] Test focuses on observable outputs, not internal implementation
- [ ] Assertions are specific and meaningful
- [ ] Test covers one specific behavior or requirement
- [ ] Test is independent and can run in isolation
- [ ] Test uses realistic data when possible

### Implementation Quality Checklist
- [ ] Code does only what current tests require
- [ ] No speculative features not covered by tests
- [ ] Code is as simple as possible while passing tests
- [ ] Refactoring maintains test coverage
- [ ] New functionality added only after writing tests

## Integration with Property-Based Testing

Use Fast-Check for comprehensive edge case coverage:

```typescript
// Combine TDD with property-based testing
describe('DateValidator', () => {
  it('should accept valid ISO dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
        (date) => {
          const isoString = date.toISOString().split('T')[0];
          const result = validateDate(isoString);
          expect(result.valid).toBe(true);
        }
      )
    );
  });

  it('should reject invalid date formats', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
        (invalidDate) => {
          const result = validateDate(invalidDate);
          expect(result.valid).toBe(false);
          expect(result.error).toContain('Invalid date format');
        }
      )
    );
  });
});
```

## Validation Criteria

When applying TDD:
- [ ] Tests written before implementation code
- [ ] Test names describe behavior clearly
- [ ] Red-Green-Refactor cycle followed
- [ ] Tests focus on behavior, not implementation
- [ ] Minimal implementation to pass tests
- [ ] Property-based testing used for edge cases
- [ ] All tests pass before moving to next feature
- [ ] Refactoring preserves test coverage

## Anti-Patterns to Avoid

1. **Testing implementation details** instead of behavior
2. **Writing tests after code** is already implemented
3. **Over-implementing** before tests require it
4. **Vague test descriptions** that don't specify behavior
5. **Brittle tests** that break with refactoring
6. **Missing edge cases** that property-based testing would catch
7. **Large test methods** testing multiple behaviors at once