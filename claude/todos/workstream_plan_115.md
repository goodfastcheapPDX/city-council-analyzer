# Workstream Plan: Issue #115

## Branch Information
**Recommended Branch Name:** `refactor/115-remove-test-storage-mock`

**Branch Creation Commands:**
```bash
git checkout main && git pull origin main && git checkout -b refactor/115-remove-test-storage-mock
```

## Issue Overview
**Title:** Remove TestTranscriptStorage mock class - violates testing principles
**Priority:** P1-Processing
**Assignee:** Unassigned
**Issue URL:** https://github.com/goodfastcheapPDX/city-council-analyzer/issues/115

### Requirements Summary
Remove the `TestTranscriptStorage.ts` mock class that violates the project's testing principles by creating artificial mocks instead of using realistic test environments. Replace all usage with the established `createStorageForTest()` factory pattern that uses real SQLite and actual service integrations.

### Acceptance Criteria
- [ ] Remove `src/__tests__/test-utils/TestTranscriptStorage.ts` file entirely
- [ ] Identify all test files importing TestTranscriptStorage
- [ ] Replace TestTranscriptStorage usage with `createStorageForTest()` factory
- [ ] Ensure all affected tests use realistic test environments (SQLite, Docker)
- [ ] Verify test coverage remains equivalent or improves
- [ ] Update any documentation referencing TestTranscriptStorage

## Technical Analysis

### Affected Components
- **Testing Infrastructure:** Test utilities and mock implementations
- **Storage Tests:** Any tests currently using the mock storage class
- **Test Factories:** Integration with existing `createStorageForTest()` pattern
- **Documentation:** Any references to the mock class in test guidance

### Key Dependencies
- **Internal:** Existing `createStorageForTest()` factory must be functional
- **External:** SQLite in-memory database setup for realistic testing
- **Blocking:** None - this is a refactoring task that can proceed immediately

### Risk Assessment
| Risk | Impact | Likelihood | Mitigation |
|------|---------|------------|------------|
| Test failures after mock removal | High | Medium | Thorough testing with createStorageForTest() before removal |
| Performance degradation | Low | Low | SQLite in-memory is fast enough for test suite |
| Missing test coverage | Medium | Low | Verify coverage metrics before and after changes |

## Work Breakdown

### Phase 1: Discovery and Analysis (Estimated: 2 hours)
- [ ] **Find all TestTranscriptStorage usage** - Search codebase for imports and references
  - **Details:** Use `grep -r "TestTranscriptStorage" src/__tests__/` to find all usage
  - **Dependencies:** None
  - **Definition of Done:** Complete list of affected test files documented

- [ ] **Analyze createStorageForTest() factory** - Understand replacement pattern
  - **Details:** Review existing factory implementation and usage patterns
  - **Dependencies:** None
  - **Definition of Done:** Clear understanding of how to replace mock usage

### Phase 2: Test Migration (Estimated: 4 hours)
- [ ] **Update affected test files** - Replace mock imports with factory
  - **Details:** Replace `TestTranscriptStorage` imports with `createStorageForTest()` calls
  - **Dependencies:** Phase 1 discovery complete
  - **Definition of Done:** All test files use realistic storage instead of mocks

- [ ] **Verify test functionality** - Ensure all tests pass with realistic backends
  - **Details:** Run test suite and fix any failures caused by realistic vs mock behavior
  - **Dependencies:** Test file updates complete
  - **Definition of Done:** All tests pass with realistic storage backends

### Phase 3: Cleanup and Validation (Estimated: 1 hour)
- [ ] **Remove TestTranscriptStorage file** - Delete the mock implementation
  - **Details:** Delete `src/__tests__/test-utils/TestTranscriptStorage.ts`
  - **Dependencies:** All usage replaced
  - **Definition of Done:** File removed, no remaining references in codebase

- [ ] **Final validation** - Run full test suite and check coverage
  - **Details:** Execute `npm run test` and `npm run test:coverage` to validate
  - **Dependencies:** All cleanup complete
  - **Definition of Done:** Full test suite passes, coverage maintained or improved

## Effort Estimation
- **Total Estimated Effort:** 7 hours
- **Critical Path Duration:** 7 hours (sequential tasks)
- **Parallelizable Work:** Discovery and analysis phases could partially overlap
- **Team Size Recommendation:** 1 developer (focused refactoring work)

## Testing Strategy
- **Unit Tests:** Ensure all existing unit tests continue to pass with realistic storage
- **Integration Tests:** Verify storage integration tests work with actual backends
- **Property Tests:** Confirm property-based tests work with real data flows
- **Performance Tests:** Validate test execution time remains reasonable (<30s total)

## Deployment Plan
- [ ] **Development:** No deployment changes needed (testing infrastructure only)
- [ ] **Staging:** No staging changes required
- [ ] **Production:** No production impact
- [ ] **Rollback Plan:** Git revert if test failures emerge after changes

## Success Metrics
- **Functional:** All tests pass with realistic storage backends
- **Performance:** Test execution time remains under 30 seconds
- **Code Quality:** No mock implementations remain in storage testing

## Branch Workflow
1. **Create branch:** `git checkout -b refactor/115-remove-test-storage-mock`
2. **Regular commits:** Use conventional commit format with "refactor" type
3. **Push frequently:** `git push -u origin refactor/115-remove-test-storage-mock`
4. **Draft PR early:** Create draft PR showing progress on mock removal
5. **Final review:** Convert to ready for review when all tests pass

## Implementation Details

### Search Commands
```bash
# Find all TestTranscriptStorage usage
grep -r "TestTranscriptStorage" src/__tests__/
grep -r "TestTranscriptStorage" src/

# Find createStorageForTest usage examples
grep -r "createStorageForTest" src/__tests__/
```

### Replacement Pattern
**Before (Mock):**
```typescript
import { TestTranscriptStorage } from '../test-utils/TestTranscriptStorage';

const storage = new TestTranscriptStorage();
```

**After (Realistic):**
```typescript
import { createStorageForTest } from '@/lib/storage/factories';

const storage = createStorageForTest();
```

### Testing Commands
```bash
# Run affected tests
npm run test

# Check coverage
npm run test:coverage

# Run storage-specific tests
npm run test:storage
```

## Next Actions
1. **Immediate (Next 1-2 days):**
   - Create the recommended branch
   - Run search commands to identify all TestTranscriptStorage usage
   - Review createStorageForTest() factory implementation

2. **Short-term (This week):**
   - Replace all mock usage with realistic factory pattern
   - Verify test functionality with realistic backends
   - Remove TestTranscriptStorage file

3. **Before Implementation:**
   - Ensure development environment has SQLite support
   - Confirm createStorageForTest() is fully functional
   - Review testing strategy documentation for alignment

## Alignment with Project Principles

This workstream directly supports the project's established testing principles:

**From claude/rules/testing-strategy.md:**
- "Use realistic test environments over mocks"
- "Avoid manually mocking services that can change"
- "Test with real infrastructure when possible"

**From CLAUDE.md:**
- "Realistic environments over mocking (SQLite, Docker)"
- "Property-based testing with Fast-Check for edge cases"

The removal of TestTranscriptStorage eliminates a violation of these principles and brings the testing infrastructure into full alignment with the project's established methodology.