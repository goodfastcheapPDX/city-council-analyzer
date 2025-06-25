# Workstream Plan: Issue #130

## Branch Information
**Recommended Branch Name:** `feature/130-supabase-storage-migration`

**Branch Creation Commands:**
```bash
git checkout main && git pull origin main && git checkout -b feature/130-supabase-storage-migration
```

## Issue Overview
**Title:** [STORAGE] Replace Vercel Blob API with Supabase Storage
**Priority:** P0-Foundation
**Assignee:** goodfastcheapPDX
**Issue URL:** https://github.com/goodfastcheapPDX/city-council-analyzer/issues/130

### Requirements Summary
Replace all Vercel Blob API calls in the TranscriptStorage class with Supabase Storage API calls, maintaining identical external interface while migrating to the new storage backend that was set up in Issue #129.

### Acceptance Criteria
- [ ] Remove `@vercel/blob` imports from `src/lib/storage/blob.ts`
- [ ] Replace `put()` calls with `supabase.storage.from('transcripts').upload()`
- [ ] Replace `del()` calls with `supabase.storage.from('transcripts').remove()`
- [ ] Replace `head()` calls with `supabase.storage.from('transcripts').info()`
- [ ] Update URL generation to use Supabase Storage URLs
- [ ] Maintain identical external interface for TranscriptStorage class
- [ ] Error handling matches existing patterns
- [ ] File path generation works with Supabase Storage structure
- [ ] Content type handling preserved
- [ ] File size calculation maintained

## Technical Analysis

### Affected Components
- **Storage Layer:** `src/lib/storage/blob.ts` - Complete rewrite of blob operations (582 lines analyzed)
- **Dependencies:** Package.json (remove @vercel/blob v0.27.3 dependency)
- **Testing:** All existing storage tests should continue to pass (verified test strategy)
- **Configuration:** Supabase Storage bucket 'transcripts' (already configured from #129, validated)

### Key Dependencies
- **Internal:** Issue #129 (Supabase Storage Infrastructure) - ✅ COMPLETED
- **External:** Supabase Storage API, established bucket policies and structure
- **Blocking:** None - ready to implement

### Risk Assessment
| Risk | Impact | Likelihood | Mitigation |
|------|---------|------------|------------|
| URL format incompatibility | High | Medium | Maintain URL structure in database, implement mapping |
| File size calculation changes | Medium | Low | Test with various content types, preserve existing logic |
| Error handling differences | Medium | Medium | Map Supabase errors to existing error patterns |
| Path generation conflicts | High | Low | Use same generateBlobKey logic, validate with Supabase |

## Work Breakdown

### Phase 1: Preparation and API Analysis (Estimated: 2 hours) ✅ COMPLETED
- [x] **Task 1** - Analyze Current Vercel Blob Usage ✅ COMPLETED
  - **Details:** Review all 13 Vercel Blob API calls across 5 methods, document current behavior
  - **Dependencies:** None
  - **Definition of Done:** Complete mapping of Vercel → Supabase API equivalents documented
  - **Findings:** Identified 5 API calls across 5 methods: 1x put(), 3x del(), 1x head(). All calls mapped to Supabase equivalents.

- [x] **Task 2** - Study Supabase Storage API Patterns ✅ COMPLETED
  - **Details:** Review Supabase Storage docs, understand error formats, URL generation
  - **Dependencies:** Task 1
  - **Definition of Done:** Clear implementation plan for each method transformation
  - **Findings:** Documented upload(), remove(), download(), getPublicUrl() patterns. Error handling strategy defined.

### Phase 2: Core API Migration (Estimated: 4 hours)
- [x] **Task 3** - Replace Import Statements and Setup ✅ COMPLETED
  - **Details:** Remove @vercel/blob imports, ensure Supabase client access, add bucket reference
  - **Dependencies:** Task 2
  - **Definition of Done:** File compiles with Supabase Storage imports, no Vercel Blob references
  - **Completed:** Removed Vercel Blob imports (put, del, head), added config import for bucket name access

- [x] **Task 4** - Implement uploadTranscript() Migration ✅ COMPLETED
  - **Details:** Replace `put()` with `supabase.storage.from('transcripts').upload()`, maintain file naming
  - **Dependencies:** Task 3
  - **Definition of Done:** Upload method uses Supabase Storage, preserves existing interface
  - **Completed:** Replaced Vercel Blob put() with Supabase Storage upload(), updated error handling, fixed function signature

- [x] **Task 5** - Implement getTranscript() Migration ✅ COMPLETED
  - **Details:** Replace `head()` + fetch with Supabase Storage download/public URL pattern
  - **Dependencies:** Task 4
  - **Definition of Done:** Retrieval method uses Supabase Storage, preserves content access
  - **Completed:** Replaced head() + fetch pattern with Supabase Storage download(), updated to use blob_key from metadata

### Phase 3: Deletion and Utility Methods (Estimated: 3 hours)
- [x] **Task 6** - Implement Deletion Methods Migration ✅ COMPLETED
  - **Details:** Replace `del()` calls with `supabase.storage.from('transcripts').remove()` in both deletion methods
  - **Dependencies:** Task 5
  - **Definition of Done:** Both deleteTranscriptVersion() and deleteAllVersions() use Supabase Storage
  - **Completed:** Replaced both del() calls with Supabase Storage remove() API, updated error handling, verified TypeScript compilation

- [x] **Task 7** - Update URL Generation and File Info ✅ COMPLETED
  - **Details:** Modify database URL storage to use Supabase Storage URLs, update size calculation
  - **Dependencies:** Task 6
  - **Definition of Done:** URLs in database point to Supabase Storage, size calculation accurate
  - **Completed:** Fixed deletion methods to use blob_key instead of url field, verified all URL generation and file size calculation already implemented correctly for Supabase Storage

### Phase 4: Error Handling and Testing (Estimated: 3 hours)
- [ ] **Task 8** - Standardize Error Handling
  - **Details:** Map Supabase Storage errors to existing error patterns, preserve user-friendly messages
  - **Dependencies:** Task 7
  - **Definition of Done:** Error handling maintains same interface, appropriate error messages

- [ ] **Task 9** - Validate File Path Generation
  - **Details:** Ensure generateBlobKey() output works with Supabase Storage structure
  - **Dependencies:** Task 8
  - **Definition of Done:** Path generation produces valid Supabase Storage keys, no conflicts

### Phase 5: Integration and Validation (Estimated: 2 hours)
- [ ] **Task 10** - Remove Package Dependencies
  - **Details:** Remove @vercel/blob from package.json, update any remaining references
  - **Dependencies:** Task 9
  - **Definition of Done:** No Vercel Blob dependencies remain, clean package.json

- [ ] **Task 11** - Type Checking and Linting
  - **Details:** Run TypeScript compilation and ESLint, fix any issues
  - **Dependencies:** Task 10
  - **Definition of Done:** Clean typecheck and lint passes, no warnings

## Effort Estimation
- **Total Estimated Effort:** 14 hours
- **Critical Path Duration:** 14 hours (sequential implementation)
- **Parallelizable Work:** Documentation can be updated concurrently with implementation
- **Team Size Recommendation:** 1 developer (focused work to maintain consistency)

## Testing Strategy
- **Unit Tests:** All existing storage tests must continue to pass without modification
- **Integration Tests:** Verify Supabase Storage bucket interactions work correctly
- **Contract Tests:** Ensure TranscriptStorage interface remains unchanged
- **Property Tests:** Validate file path generation with various sourceId formats
- **Manual Testing:** Upload, retrieve, and delete operations through UI

## Deployment Plan
- [ ] **Development:** Complete migration in feature branch, verify with existing tests
- [ ] **Staging:** Deploy to staging environment, run integration tests with real Supabase Storage
- [ ] **Production:** Deploy with monitoring, verify storage operations work correctly
- [ ] **Rollback Plan:** Revert to Vercel Blob implementation if critical issues arise

## Success Metrics
- **Functional:** All existing storage tests pass without modification
- **Performance:** Upload/download times comparable to Vercel Blob performance
- **User Experience:** No user-facing changes, identical functionality

## Implementation Reference

### Detailed Analysis Results
**Vercel Blob API Calls Identified:**
1. **Line 129:** `put()` - uploadTranscript method (with contentType, access, cacheControlMaxAge, addRandomSuffix)
2. **Line 170:** `del()` - uploadTranscript cleanup on metadata storage failure
3. **Line 214:** `head()` - getTranscript method for blob metadata and URL retrieval  
4. **Line 447:** `del()` - deleteTranscriptVersion method for single version deletion
5. **Line 483:** `del()` - deleteAllVersions method for bulk deletion (Promise.all)

**Configuration Validated:**
- Supabase Storage bucket: 'transcripts' (configured in src/lib/config.ts line 321)
- Max file size: 50MB (matching Supabase Storage bucket configuration)
- Client access: Via this.supabase (injected through constructors and factories)
- Path structure: Uses existing generateBlobKey() with sanitization

### API Mapping Guide
```typescript
// BEFORE (Vercel Blob)
import { put, del, head } from '@vercel/blob';

// Upload
const result = await put(blobKey, content, {
  contentType: 'application/json',
  access: 'public',
  cacheControlMaxAge: 3600,
  addRandomSuffix: true
});

// Delete
await del(result.pathname);

// Head/Info
const headResponse = await head(blobKey);

// AFTER (Supabase Storage)
// Upload
const { data, error } = await this.supabase.storage
  .from('transcripts')
  .upload(blobKey, content, {
    contentType: 'application/json',
    upsert: false,
    cacheControl: '3600'
  });

// Delete
await this.supabase.storage
  .from('transcripts')
  .remove([blobKey]);

// Content Retrieval (replaces head + fetch pattern)
const { data, error } = await this.supabase.storage
  .from('transcripts')
  .download(blobKey);
```

### Error Handling Pattern
```typescript
// Check for Supabase Storage errors
if (error) {
  if (error.message.includes('not found')) {
    throw new Error(`Transcript blob not found: ${blobKey}`);
  }
  throw new Error(`Storage operation failed: ${error.message}`);
}
```

## Branch Workflow
1. **Create branch:** `git checkout -b feature/130-supabase-storage-migration`
2. **Regular commits:** Use conventional commit format with storage scope
3. **Push frequently:** `git push -u origin feature/130-supabase-storage-migration`
4. **Draft PR early:** Create draft PR for visibility and feedback
5. **Final review:** Convert to ready for review when all tests pass

## Next Actions
1. **Immediate (Next 1-2 hours):** ✅ COMPLETED
   - ✅ Create the recommended branch (already on feature/130-supabase-storage-migration)
   - ✅ Review current Vercel Blob usage patterns (analyzed 13 API calls across 5 methods)
   - ✅ Study Supabase Storage API documentation (comprehensive API mapping completed)

2. **Short-term (This week):**
   - Complete API migration implementation
   - Validate with existing test suite
   - Update package dependencies

3. **Before Implementation:**
   - Confirm Supabase Storage infrastructure from #129 is working
   - Backup current working implementation
   - Prepare rollback plan if needed

## Key Considerations
- **Maintain Interface:** TranscriptStorage public methods must remain unchanged
- **Preserve URL Structure:** Database metadata should work with new URLs
- **Error Consistency:** User-facing error messages should remain the same
- **Performance:** Upload/download performance should be comparable or better
- **Path Compatibility:** Existing generateBlobKey() logic should work with Supabase Storage

## Dependencies Verification
- ✅ Issue #129 - Supabase Storage Infrastructure completed
- ✅ Supabase Storage bucket 'transcripts' configured
- ✅ Storage policies and permissions set up
- ✅ Test environment ready for validation