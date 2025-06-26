# Development Memories Guidelines

## Purpose
This rule captures project-specific development patterns, tool usage, and technical decisions that should be consistently applied across development sessions.

## When to Apply
Apply this rule when:
- Working with dates and time handling
- Creating TypeScript types and interfaces
- Using Supabase CLI commands
- Managing GitHub issues and project workflow
- Making architectural decisions about runtime boundaries

## Core Development Principles

### Runtime Boundary Enforcement
- **Critical Rule**: NEVER mix server and client runtime code in the same file
- **Browser vs Node**: Keep browser-specific imports separate from Node.js-specific imports
- **Factory Pattern**: Use environment-specific factories (`factories/server.ts`, `factories/client.ts`, `factories/test.ts`)
- **API Routes**: Only import server-side libraries and factories in `app/api/` files
- **Client Components**: Only import client-side libraries and factories
- **Shared Code**: Keep in separate files with no runtime dependencies (types only)

## Technical Implementation Patterns

### Date and Time Handling
- **Primary Rule**: Always use the project's dateUtils library for all date operations
- **Forbidden**: Never use native JavaScript `Date` functions directly
- **Forbidden**: Never import Luxon directly outside of the config interface
- **Extension Pattern**: If new date-related needs arise, edit or add to the config date lib
- **Consistency**: All date operations must go through the standardized dateUtils interface
- **Timezone**: All database operations use UTC via dateUtils enforcement

### TypeScript Type Definitions
- **Const Assertions**: Always prefer `as const` for types with finite known permutations
- **Benefit**: Provides stronger type checking and better IDE support
- **Usage Pattern**: `const StatusTypes = ['pending', 'in_progress', 'completed'] as const`
- **Type Derivation**: `type Status = typeof StatusTypes[number]`
- **Immutability**: Prevents accidental modification of type definition arrays

### Supabase CLI Usage
- **Command Pattern**: Always use `npx supabase...` not `supabase...`
- **Reason**: Ensures consistent version usage across different development environments
- **Examples**: 
  - `npx supabase start` not `supabase start`
  - `npx supabase migration new` not `supabase migration new`
  - `npx supabase db reset` not `supabase db reset`

## Project Workflow Patterns

### GitHub Issue Management
- **Status Labels**: Use standardized status labels while working on issues:
  - `status:ready` - Dependencies met, can start immediately
  - `status:in_progress` - Currently being worked on
  - `status:blocked` - Waiting on specific dependencies
  - `status:review` - Implementation complete, needs testing/review
- **Epic Organization**: When creating 3+ related issues, organize into epics:
  - Use `epic` label for parent issue
  - Reference epic in child issues with "Part of epic #XXX"
  - No need for complex sub-issue relationships
- **API Integration**: Update issue status using GitHub API as work progresses

### Storage Architecture Decisions
- **Primary Storage**: Supabase Storage for all file operations (replaced Vercel Blob)
- **Database**: Supabase for metadata, relationships, and vector embeddings
- **Testing**: Use `createStorageForTest()` factory for realistic test environments
- **Configuration**: 50MB file size limit enforced at storage layer

### Logging Infrastructure
- **Structured Logging**: Use Adze library for all application logging
- **Correlation IDs**: All requests tracked with UUID correlation identifiers
- **Performance Timing**: Operations >100ms automatically instrumented
- **Environment Awareness**: Logging level and output format varies by environment
- **No Console**: Replace all `console.log/error` statements with structured Adze logging

## Validation Criteria

When applying development memories:
- [ ] Date operations use dateUtils, not native Date functions
- [ ] TypeScript finite types use `as const` assertions
- [ ] Supabase commands use `npx` prefix
- [ ] GitHub issues have appropriate status labels
- [ ] Runtime boundaries maintained (no server/client mixing)
- [ ] Storage operations use Supabase Storage, not Vercel Blob
- [ ] Logging uses Adze with correlation IDs, not console statements

## Anti-Patterns to Avoid

1. **Direct Date Usage**: `new Date()`, `Date.now()`, `date.getTime()`
2. **Mixed Runtime Code**: Server imports in client components or vice versa
3. **Global CLI Tools**: `supabase` instead of `npx supabase`
4. **Untracked Issues**: Working on issues without status label updates
5. **Console Logging**: `console.log()` instead of structured Adze logging
6. **Over-Engineering**: Building complex solutions for simple requirements
7. **Legacy Storage**: References to Vercel Blob instead of Supabase Storage

## Integration with Other Rules

### With Test-Driven Development
- Apply minimal solution principle to test implementation
- Use dateUtils in all test date generation
- Maintain runtime boundaries in test factories

### With Git Commit Standards
- Reference issue status changes in commit messages
- Document architectural decisions about runtime boundaries
- Include storage migration context in relevant commits

### With Backlog Management
- Apply epic organization patterns when creating related issues
- Use consistent status labeling across issue lifecycle
- Reference storage and logging infrastructure in technical implementation plans