# Workstream Plan: Issue #140

## Branch Information
**Recommended Branch Name:** `hotfix/140-esm-build-failure`

**Branch Creation Commands:**
```bash
git checkout main && git pull origin main && git checkout -b hotfix/140-esm-build-failure
```

## Issue Overview
**Title:** 🚨 Critical ESM Build Failure - ES Modules export syntax error blocking production builds
**Priority:** P0-Foundation - Critical Bug (Urgent)
**Assignee:** goodfastcheapPDX
**Issue URL:** https://github.com/[repo]/issues/140

### Requirements Summary
Fix critical production build failure caused by ES Modules export syntax compatibility issues. **This has been a long-standing issue** that may be related to a transitive dependency conflict, possibly within the supabase-js package ecosystem. The webpack runtime encounters module.exports assignments in ESM context, preventing successful builds and blocking all production deployments.

### Acceptance Criteria
- [ ] `npm run build` completes successfully without errors
- [ ] All API routes compile correctly in production build
- [ ] `/api/transcripts/[sourceId]` endpoint functions in production environment
- [ ] No ESM/CommonJS module conflicts in build output
- [ ] Build process generates valid server-side chunks

## Technical Analysis

### Affected Components
- **Backend:** API routes, specifically `/api/transcripts/[sourceId]/route.ts`
- **Build System:** Next.js webpack compilation process
- **Dependencies:** Likely transitive dependency issue, possibly supabase-js related
- **Infrastructure:** Production deployment pipeline completely blocked

### Key Dependencies
- **Internal:** No dependencies - this blocks all other work
- **External:** Next.js build system, webpack runtime, supabase-js ecosystem
- **Blocking:** This issue blocks all production deployments and potentially other development work

### Root Cause Hypothesis
**Long-standing Issue Context:**
- This problem has persisted for an extended period
- External analysis suggests **transitive dependency conflict**
- **Primary suspect: supabase-js** or its dependency chain
- May be related to CommonJS/ESM compatibility in the dependency tree

### Risk Assessment
| Risk | Impact | Likelihood | Mitigation |
|------|---------|------------|------------|
| Transitive dependency incompatibility | Critical | High | Binary search isolation strategy |
| Multiple conflicting dependencies | High | Medium | Systematic dependency audit |
| Deep dependency chain issue | High | Medium | Package-lock analysis |
| Configuration vs dependency issue | Medium | Low | Test with minimal reproduction |

## Work Breakdown

### Phase 1: Systematic Binary Search Isolation (Estimated: 3-4 hours)
**CRITICAL: Follow exact step-by-step elimination process**

- [x] **Task 1.1** - Baseline Error Reproduction ✅ 2025-06-25
  - **COMPLETED**: Error reproduced successfully, logged to build-error.log
  - **RESULT**: No explicit module.exports found in source code - issue is in compiled output
  - **EVIDENCE**: ES Modules error occurs during "Collecting page data" phase
  
- [x] **Task 1.2** - Complete File Elimination Test ✅ 2025-06-25
  - **COMPLETED**: Minimal route.ts with only handler exports does NOT reproduce error
  - **RESULT**: Problem is in original route.ts content, not in handlers.ts
  - **EVIDENCE**: Minimal export syntax compiles successfully (with type warnings)
  - **Exact Commands:**
    ```bash
    mv src/app/api/transcripts/\[sourceId\]/route.ts src/app/api/transcripts/\[sourceId\]/route.ts.backup
    echo 'export { GET, POST, PUT, DELETE } from "./handlers";' > src/app/api/transcripts/\[sourceId\]/route.ts
    npm run build 2>&1 | tee build-minimal.log
    ```
  - **Decision Tree:**
    - **If build succeeds:** Problem is in original route.ts content → Go to Task 1.3
    - **If build fails with same error:** Problem is in handlers.ts or deeper → Go to Task 1.5
    - **If build fails with different error:** Note new error, may need to create truly minimal route

- [x] **Task 1.3** - Import Statement Isolation ✅ 2025-06-25
  - **COMPLETED**: Identified `createStorageForServer` import as the culprit
  - **RESULT**: Single import `import { createStorageForServer } from '@/lib/storage/factories';` reproduces error
  - **EVIDENCE**: Minimal route with only this import fails with same ES Modules error
  - **Exact Commands:**
    ```bash
    # Restore original file
    cp route.ts.backup route.ts
    
    # Test each import individually
    grep "^import" route.ts > imports.txt
    cat imports.txt  # Review all imports
    
    # Comment out ALL imports, test
    sed 's/^import/#import/g' route.ts > route-no-imports.ts
    mv route-no-imports.ts route.ts
    npm run build
    ```
  - **Decision Tree:**
    - **If build succeeds:** Issue is in one of the imports → Binary search imports
    - **If build fails:** Issue is in the function code itself → Search for module.exports patterns

- [ ] **Task 1.4** - Binary Search Imports (Only if imports are the problem)
  - **Exact Commands:**
    ```bash
    # Restore file and get import count
    cp route.ts.backup route.ts
    IMPORT_COUNT=$(grep -c "^import" route.ts)
    HALF=$((IMPORT_COUNT / 2))
    
    # Comment out first half of imports
    sed "1,${HALF}s/^import/#import/g" route.ts > route-half.ts
    mv route-half.ts route.ts
    npm run build
    
    # If succeeds: problem in second half
    # If fails: problem in first half
    # Continue halving until single import identified
    ```
  - **Success Criteria:** Identified single problematic import statement

- [ ] **Task 1.5** - Handlers File Investigation (If route.ts minimal still fails)
  - **Exact Commands:**
    ```bash
    # Test handlers file in isolation
    mv src/app/api/transcripts/\[sourceId\]/handlers.ts src/app/api/transcripts/\[sourceId\]/handlers.ts.backup
    
    # Create minimal handlers file
    cat > src/app/api/transcripts/\[sourceId\]/handlers.ts << 'EOF'
    import { NextRequest, NextResponse } from 'next/server';
    export async function GET() { return NextResponse.json({}); }
    export async function POST() { return NextResponse.json({}); }
    export async function PUT() { return NextResponse.json({}); }
    export async function DELETE() { return NextResponse.json({}); }
    EOF
    
    npm run build
    ```
  - **Decision Tree:**
    - **If build succeeds:** Problem is in handlers.ts content → Apply binary search to handlers.ts
    - **If build fails:** Problem is deeper in dependency chain → Go to Phase 2

- [x] **Task 1.6** - Dependency Chain Deep Analysis ✅ 2025-06-25
  - **COMPLETED**: Mapped complete import chain to root cause
  - **ROOT CAUSE**: `@supabase/supabase-js@2.49.1` causing ES Module compatibility issues
  - **IMPORT CHAIN**: route.ts → factories.ts → `import { createClient } from '@supabase/supabase-js'`
  - **EVIDENCE**: Storage factories directly imports supabase-js which has CommonJS/ESM conflicts
  - **Exact Commands:**
    ```bash
    # Find all imports in the problematic file chain
    find src/app/api/transcripts/\[sourceId\]/ -name "*.ts" -exec grep -H "^import.*from" {} \;
    
    # Check for any remaining require() statements
    find src/ -name "*.ts" -exec grep -H "require(" {} \;
    
    # Analyze package.json imports
    grep -E "(supabase|@supabase)" package.json
    npm ls @supabase/supabase-js --depth=10
    ```
  - **Success Criteria:** Complete map of import chain from route → handlers → dependencies

### Phase 2: Root Cause Analysis & Solution Design (Estimated: 1-2 hours)
**ANALYSIS COMPLETE - Root cause identified and solution designed**

- [x] **Task 2.1** - Root Cause Analysis ✅ 2025-06-25
  - **ROOT CAUSE IDENTIFIED**: Next.js static analysis during build pulls entire supabase-js dependency graph
  - **CORE ISSUE**: Mixed runtime contexts (server/client/test) in single factories.ts file
  - **TECHNICAL DETAILS**: 
    - Static analysis sees `import { createClient } from '@supabase/supabase-js'` in factories.ts
    - Supabase-js internally uses Node.js polyfills (`require('stream')`, `module.exports`)
    - These violate ESM constraints during build-time analysis
    - Problem occurs at build-time, not runtime
  
- [x] **Task 2.2** - Solution Strategy Design ✅ 2025-06-25
  - **SOLUTION**: Split factories.ts into separate files by runtime context
  - **RATIONALE**: Prevents cross-contamination between server/client/test environments
  - **BENEFITS**: 
    - Eliminates static analysis issue by isolating supabase imports
    - Follows Next.js best practices for environment separation
    - Improves maintainability with clear boundaries
    - Future-proofs against similar ESM/CommonJS conflicts

### Phase 3: File Structure Refactoring Implementation ✅ COMPLETE (Estimated: 2-3 hours)
**IMPLEMENTATION PLAN: Split factories.ts by runtime context**

- [x] **Task 3.1** - Create Factories Directory Structure ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    # Create new directory structure
    mkdir -p src/lib/storage/factories
    
    # Backup original factories file
    cp src/lib/storage/factories.ts src/lib/storage/factories.ts.backup
    
    # Create directory structure
    ls -la src/lib/storage/factories/  # Should be empty initially
    ```
  - **Success Criteria:** New factories/ directory created, original file backed up

- [x] **Task 3.2** - Create Server-Only Factory ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    cat > src/lib/storage/factories/server.ts << 'EOF'
    import { createClient } from '@supabase/supabase-js';
    import { TranscriptStorage } from '../blob';

    /**
     * Create storage client for server-side operations (API routes, SSR)
     * Uses service key for full database access
     */
    export function createStorageForServer(): TranscriptStorage {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing server environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      }

      const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
      return new TranscriptStorage(supabaseClient);
    }
    EOF
    
    # Test compilation
    npx tsc --noEmit src/lib/storage/factories/server.ts
    ```
  - **Success Criteria:** Server factory compiles without errors

- [x] **Task 3.3** - Create Client-Only Factory ✅ 2025-06-25  
  - **Exact Commands:**
    ```bash
    cat > src/lib/storage/factories/client.ts << 'EOF'
    import { createClient } from '@supabase/supabase-js';
    import { TranscriptStorage } from '../blob';

    /**
     * Create storage client for client-side operations (browser, components)
     * Uses anon key with RLS policies
     */
    export function createStorageForClient(): TranscriptStorage {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing client environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
      }

      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      return new TranscriptStorage(supabaseClient);
    }
    EOF
    
    # Test compilation
    npx tsc --noEmit src/lib/storage/factories/client.ts
    ```
  - **Success Criteria:** Client factory compiles without errors

- [x] **Task 3.4** - Create Test-Only Factory with Dynamic Import ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    cat > src/lib/storage/factories/test.ts << 'EOF'
    import { TranscriptStorage } from '../blob';

    /**
     * Create storage client for test environment
     * Uses dynamic import to avoid static analysis issues
     */
    export async function createStorageForTest(pathPrefix?: string): Promise<TranscriptStorage> {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing test DB environment variables');
      }

      if (!supabaseUrl.includes('test')) {
        console.warn(`⚠️ Not using isolated test DB: ${supabaseUrl}`);
      }

      // Dynamic import to avoid static analysis
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseClient = createClient(supabaseUrl, supabaseKey);
      return new TranscriptStorage(supabaseClient, pathPrefix ?? 'test-transcripts');
    }

    /**
     * Synchronous version using require() for environments that support it
     */
    export function createStorageForTestSync(pathPrefix?: string): TranscriptStorage {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing test DB environment variables');
      }

      // Use require to avoid static analysis
      const { createClient } = require('@supabase/supabase-js');
      const supabaseClient = createClient(supabaseUrl, supabaseKey);
      return new TranscriptStorage(supabaseClient, pathPrefix ?? 'test-transcripts');
    }
    EOF
    
    # Test compilation
    npx tsc --noEmit src/lib/storage/factories/test.ts
    ```
  - **Success Criteria:** Test factory compiles and provides both async/sync options

- [x] **Task 3.5** - Update API Route Imports ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    # Update the problematic route file
    cat > src/app/api/transcripts/\[sourceId\]/route.ts << 'EOF'
    export { GET, POST, PUT, DELETE } from './handlers';
    EOF
    
    # Update handlers to use server factory
    cp src/app/api/transcripts/\[sourceId\]/handlers.ts src/app/api/transcripts/\[sourceId\]/handlers.ts.backup
    
    # Replace factories import in handlers
    sed -i 's|import { createStorageForServer } from.*|import { createStorageForServer } from "@/lib/storage/factories/server";|g' src/app/api/transcripts/\[sourceId\]/handlers.ts
    
    # Test build
    npm run build 2>&1 | tee build-after-refactor.log
    ```
  - **Success Criteria:** API route builds successfully with new import structure

- [x] **Task 3.6** - Update All Other Import References ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    # Find all files importing from the old factories file
    grep -r "from.*factories" src/ --include="*.ts" --include="*.tsx"
    
    # Update test files to use test factory
    find src/__tests__ -name "*.ts" -exec sed -i 's|createStorageForTest|createStorageForTestSync|g' {} \;
    find src/__tests__ -name "*.ts" -exec sed -i 's|import.*factories.*|import { createStorageForTestSync as createStorageForTest } from "@/lib/storage/factories/test";|g' {} \;
    
    # Update any client components (if they exist)
    find src/components -name "*.tsx" -exec sed -i 's|createStorageForClient|import { createStorageForClient } from "@/lib/storage/factories/client";|g' {} \; 2>/dev/null || true
    
    # Verify no remaining imports from old factories.ts
    grep -r "from.*factories[^/]" src/ --include="*.ts" --include="*.tsx" || echo "No old imports found ✅"
    ```
  - **Success Criteria:** All imports updated, no references to old factories.ts file

### Phase 4: Testing & Validation ✅ COMPLETE (Estimated: 1-2 hours)
**Verify the refactoring solves the build issue**

- [x] **Task 4.1** - Production Build Testing ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    # Test the build after refactoring
    npm run build 2>&1 | tee build-final-test.log
    
    # Check for success indicators
    grep -i "completed successfully" build-final-test.log
    grep -i "error" build-final-test.log
    
    # Verify no ESM errors
    grep -i "ES Modules may not assign" build-final-test.log && echo "❌ ESM error still present" || echo "✅ ESM error resolved"
    
    # Check build artifacts
    ls -la .next/server/app/api/transcripts/\[sourceId\]/
    cat .next/server/app/api/transcripts/\[sourceId\]/route.js | head -5
    ```
  - **Success Criteria:** Build completes without ESM-related errors, artifacts generated correctly

- [x] **Task 4.2** - API Functionality Testing ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    # Start production build locally
    npm run build && npm run start &
    SERVER_PID=$!
    sleep 5  # Wait for server to start
    
    # Test API endpoints
    curl -X GET http://localhost:3000/api/transcripts 2>/dev/null | jq '.' || echo "GET endpoint test"
    curl -X GET http://localhost:3000/api/transcripts/test-id 2>/dev/null | jq '.' || echo "GET specific endpoint test"
    
    # Kill test server
    kill $SERVER_PID
    ```
  - **Success Criteria:** API endpoints respond without errors, supabase connections work

- [x] **Task 4.3** - Test Suite Validation ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    # Run all tests to ensure no regressions
    npm run test 2>&1 | tee test-results.log
    
    # Check test results
    grep -E "(PASS|FAIL)" test-results.log
    grep -i "error" test-results.log
    
    # Run storage-specific tests
    npm run test:storage 2>&1 | tee storage-test-results.log
    
    # Verify test factories work
    grep -i "storage" storage-test-results.log
    ```
  - **Success Criteria:** All tests pass, no import-related failures

- [x] **Task 4.4** - Development Server Testing ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    # Test dev server still works
    npm run dev &
    DEV_PID=$!
    sleep 10  # Wait for dev server
    
    # Test dev endpoints
    curl -X GET http://localhost:3000/api/transcripts 2>/dev/null | jq '.' || echo "Dev server test"
    
    # Kill dev server
    kill $DEV_PID
    ```
  - **Success Criteria:** Development server starts and runs without ESM errors

- [x] **Task 4.5** - Clean Up and Documentation ✅ 2025-06-25
  - **Exact Commands:**
    ```bash
    # Remove old factories.ts file (after confirming everything works)
    rm src/lib/storage/factories.ts.backup
    
    # Document the change in commit message
    echo "refactor(storage): split factories by runtime context to fix ESM build issue

    - Split factories.ts into separate server/client/test files
    - Prevents Next.js static analysis from pulling supabase-js into ESM context  
    - Server factory: uses service key for API routes
    - Client factory: uses anon key for browser components
    - Test factory: uses dynamic imports to avoid static analysis
    - Resolves ES Modules assignment error during build

    Fixes #140" > commit-message.txt
    
    # Show what files were created/modified
    git status
    ```
  - **Success Criteria:** Clean repository state, comprehensive documentation ready

## Common ESM/CommonJS Conflict Patterns to Look For

**In your code search, look for these specific patterns:**
```bash
# Pattern 1: Mixed export syntax
grep -r "module\.exports\s*=" src/
grep -r "exports\." src/
grep -r "export\s*=" src/

# Pattern 2: Mixed import syntax  
grep -r "const.*=.*require(" src/
grep -r "import.*=.*require(" src/

# Pattern 3: Dynamic require in static context
grep -r "require\.resolve" src/
grep -r "require\.cache" src/

# Pattern 4: Node.js built-in modules that may cause issues
grep -r "require('fs')" src/
grep -r "require('path')" src/
grep -r "require('url')" src/
```

**Expected File Structure After Investigation:**
```
src/app/api/transcripts/[sourceId]/
├── route.ts.backup           # Original file
├── handlers.ts.backup        # Original handlers
├── route.ts                  # Working version
├── handlers.ts               # Working version
└── build-test-results.txt    # Log of what worked/failed
```

## Quick Diagnostic Commands
```bash
# Run these first to understand the current state
npm run build 2>&1 | head -20                    # See first 20 lines of error
find src/ -name "*.ts" -exec grep -l "supabase" {} \;  # Find all supabase imports
node --version && npm --version                   # Check Node/npm versions
grep '"type"' package.json                       # Check if package.json declares module type
ls -la next.config.*                             # Check if next.config exists
```

## Advanced Debugging Commands
```bash
# Webpack bundle analysis
npm run build -- --debug
NEXT_DEBUG=1 npm run build                       # Enable Next.js debug mode

# Check compiled output
ls -la .next/server/app/api/transcripts/\[sourceId\]/
cat .next/server/app/api/transcripts/\[sourceId\]/route.js | head -10

# Node module resolution debugging
node -p "require.resolve('@supabase/supabase-js')"
node -p "require('@supabase/supabase-js/package.json').main"
node -p "require('@supabase/supabase-js/package.json').module"
```

## Research Strategy
1. **Start with binary search results** - don't research until you know the exact problem
2. **Search with specific error + dependency name** - "supabase-js webpack ES modules assignment"
3. **Check Next.js compatibility** - supabase-js version compatibility with Next.js
4. **Look for recent breaking changes** - in supabase-js or its dependencies
5. **Find alternative solutions** - different import patterns or package alternatives

## Effort Estimation
- **Total Estimated Effort:** 6-8 hours (significantly reduced due to root cause identification)
- **Critical Path Duration:** 4-6 hours (analysis complete → implementation → validation)
- **Parallelizable Work:** Testing can run in parallel with documentation updates
- **Team Size Recommendation:** 1 developer (focused refactoring work)

## Success Metrics
- **Functional:** Successful `npm run build` completion (0 errors)
- **Performance:** Build time should not significantly increase
- **User Experience:** Production deployment pipeline restored with full functionality

## Next Actions
1. **Immediate (Next 1-2 hours):**
   - Create hotfix branch: `git checkout -b hotfix/140-esm-build-failure`
   - Begin Phase 3 implementation: Create factories directory structure
   - Start with Task 3.1-3.2 (server factory creation)

2. **Short-term (Today):**
   - Complete all Phase 3 tasks (factory splitting and import updates)
   - Run Phase 4 validation tests to confirm build success
   - Test all functionality to ensure no regressions

3. **Before Merge:**
   - Verify production build succeeds completely
   - Confirm all tests pass with new import structure  
   - Create comprehensive commit documenting the architectural fix

## Plausible Solutions Based on Common Patterns

**Most Likely Solutions (try in order based on binary search results):**

1. **If supabase import is the culprit:**
   ```javascript
   // Current (probably failing):
   import { createClient } from '@supabase/supabase-js';
   
   // Solution 1: Dynamic import
   const { createClient } = await import('@supabase/supabase-js');
   
   // Solution 2: Conditional import
   const createClient = typeof window === 'undefined' 
     ? (await import('@supabase/supabase-js')).createClient
     : require('@supabase/supabase-js').createClient;
   ```

2. **If Next.js configuration is the issue:**
   ```javascript
   // Add to next.config.js:
   module.exports = {
     transpilePackages: ['@supabase/supabase-js'],
     experimental: { esmExternals: 'loose' }
   }
   ```

3. **If specific dependency in supabase chain:**
   ```json
   // Add to package.json:
   {
     "overrides": {
       "@supabase/supabase-js": {
         "cross-fetch": "^4.0.0",
         "form-data": "^4.0.0"
       }
     }
   }
   ```

4. **If webpack compilation issue:**
   ```javascript
   // Add to next.config.js:
   module.exports = {
     webpack: (config, { isServer }) => {
       if (isServer) {
         config.externals.push('@supabase/supabase-js');
       }
       return config;
     }
   }
   ```

## Known Working Configurations

**Research these specific combinations that others have reported working:**
- Next.js 13.4+ with @supabase/supabase-js@2.38.0+
- Next.js 14.0+ with @supabase/supabase-js@2.39.0+
- Using `esmExternals: 'loose'` configuration
- Using `transpilePackages` for supabase modules

## Troubleshooting Decision Tree

```
npm run build fails with "ES Modules may not assign"
├── Is error in route.ts? (Task 1.2 test)
│   ├── YES: Binary search route.ts content (Task 1.3-1.4)
│   └── NO: Problem in handlers.ts or dependencies (Task 1.5-1.6)
│
├── Is supabase import the culprit? (Task 2.1 test)
│   ├── YES: Try dynamic imports (Task 2.4)
│   └── NO: Look for other problematic dependencies
│
├── Do dynamic imports work? (Task 2.4)
│   ├── YES: Implement dynamic import solution
│   └── NO: Try webpack/Next.js configuration (Phase 3)
│
├── Does webpack config fix it? (Task 3.2)
│   ├── YES: Implement configuration solution
│   └── NO: Try package version changes (Task 3.4)
│
└── Do version changes work? (Task 3.4)
    ├── YES: Pin to working version
    └── NO: Consider alternative packages (Task 3.6)
```

## Critical Success Factors
- **Follow binary search methodology strictly** - don't skip steps or make assumptions
- **Document each test** - record what was commented/tested and results  
- **Test one change at a time** - don't combine multiple solutions
- **Focus research efforts** - only research after isolation identifies the culprit
- **Test incrementally** - small changes, frequent builds to catch regressions
- **Preserve functionality** - ensure supabase features continue working after fix
- **Keep working backups** - always maintain `.backup` files during testing

## Prevention Guidelines for Future Development

### **Runtime Boundary Rules**
- **NEVER mix server and client runtime code in the same file**
- **Keep browser-specific imports separate from Node.js-specific imports**
- **Use environment-specific factory patterns for external dependencies**
- **Avoid importing server-only libraries in client components**
- **Avoid importing client-only libraries in API routes**

### **File Organization Principles**
```
✅ GOOD - Separated by runtime:
src/lib/storage/factories/
├── server.ts    # API routes, SSR only
├── client.ts    # Browser components only  
├── test.ts      # Test environment only
└── types.ts     # Shared types (no runtime code)

❌ BAD - Mixed runtime contexts:
src/lib/storage/
└── factories.ts # Server + client + test all together
```

### **Import Safety Checks**
```bash
# Before committing, run these checks:

# 1. Find server-only imports in client code
grep -r "process\.env\." src/components/ src/app/\(client\)/ || echo "✅ No server imports in client"

# 2. Find client-only imports in server code  
grep -r "window\|document\|localStorage" src/app/api/ || echo "✅ No client imports in server"

# 3. Find mixed factory imports
grep -r "from.*factories[^/]" src/ --include="*.ts" || echo "✅ No mixed factory imports"

# 4. Test production build frequently
npm run build || echo "❌ Build failed - check for runtime boundary violations"
```

### **Next.js Specific Guidelines**
- **API Routes (`app/api/`)**: Only import server-side factories and Node.js libraries
- **Client Components**: Only import client-side factories and browser-compatible libraries  
- **Server Components**: Can import server-side code but avoid client-side imports
- **Shared Code**: Keep in separate files with no runtime dependencies

### **ESLint Rules to Add**
```javascript
// Add to .eslintrc.js to catch future violations:
module.exports = {
  rules: {
    // Prevent server imports in client code
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/factories.ts'],
            message: 'Use specific factory imports: server.ts, client.ts, or test.ts'
          }
        ]
      }
    ]
  },
  overrides: [
    {
      files: ['src/app/api/**/*.ts'],
      rules: {
        'no-restricted-globals': ['error', 'window', 'document', 'localStorage']
      }
    },
    {
      files: ['src/components/**/*.tsx', 'src/app/**/page.tsx'],
      rules: {
        'no-restricted-imports': [
          'error', 
          {
            patterns: ['**/factories/server.ts']
          }
        ]
      }
    }
  ]
}
```

### **Code Review Checklist**
- [ ] Does this PR mix server and client runtime contexts?
- [ ] Are factory imports environment-specific?
- [ ] Does `npm run build` succeed after changes?
- [ ] Are new external dependencies imported in appropriate runtime contexts?
- [ ] Do new files follow the server/client/test separation pattern?