# Backlog Management Guidelines

## Purpose
This rule provides specific guidance for creating, organizing, and managing GitHub issues in this repository to enable automated development work.

## When to Apply
Apply this rule when:
- Creating new GitHub issues for features or tasks
- Breaking down complex features into implementable tasks
- Organizing existing issues with labels and dependencies
- Analyzing the backlog to identify ready work
- User requests backlog analysis or issue creation

## Implementation Guidelines

### Issue Creation Standards

#### Required Information for All Issues
Every issue must include:
1. **Concrete description** - What specifically needs to be implemented
2. **Priority classification** - P0/P1/P2/P3 based on dependency chain
3. **Explicit dependencies** - List GitHub issue numbers that must complete first
4. **Detailed acceptance criteria** - Specific, testable requirements
5. **Technical implementation plan** - Files to modify/create, method signatures
6. **Testing requirements** - Property-based, integration, contract testing needs

#### Priority Classifications
- **P0-Foundation**: Core infrastructure, storage, basic validation, parsing
- **P1-Processing**: Embeddings, advanced segmentation, data transformation  
- **P2-Analysis**: RAG engine, LLM integration, topic analysis
- **P3-Enhancement**: Advanced features, optimizations, analytics

#### Status Labels
- **status:ready** - Dependencies met, can start immediately
- **status:blocked** - Waiting on specific dependencies
- **status:in-progress** - Currently being worked on
- **status:review** - Implementation complete, needs testing/review

### Issue Body Template
Use this structure for all new issues:

```markdown
## Description
[Specific implementation requirement]

## Priority
**Priority Level:** P0/P1/P2/P3 - [Category name]

## Dependencies
- [ ] #XX - [Dependency description]
- [ ] None (if no dependencies)

## Acceptance Criteria
- [ ] [Specific, testable requirement]
- [ ] [Performance expectation if applicable]
- [ ] [Error handling requirement]
- [ ] [Integration requirement]

## Technical Implementation
**Files to Modify:**
- `src/path/to/file.ts` - [What changes needed]

**New Files to Create:**
- `src/new/file.ts` - [Purpose and key exports]

**Key Implementation Details:**
- [Specific method signatures]
- [Integration points with existing code]
- [Configuration requirements]
- [Third-party API usage]

## Testing Requirements
- [ ] Unit tests with Fast-Check property-based testing
- [ ] Integration tests with realistic data
- [ ] Contract testing for external APIs
- [ ] Performance testing if applicable
- [ ] Error scenario testing

## Definition of Done
- [ ] Implementation complete and tested
- [ ] All acceptance criteria met
- [ ] No lint/type errors
- [ ] Tests passing with appropriate coverage
- [ ] Documentation updated if needed
```

### Complex Issue Decomposition

#### When to Break Down Issues
Break down an issue when it:
- Contains more than 5 acceptance criteria
- Requires creating more than 3 new files
- Has multiple distinct technical approaches
- Can be implemented by different developers independently
- Takes more than 2-3 days to implement

#### Decomposition Process
1. **Identify core components** - What are the distinct technical pieces?
2. **Map dependencies** - Which pieces must be built first?
3. **Create atomic issues** - Each should be implementable in 1-2 days
4. **Link related issues** - Use GitHub issue references for relationships
5. **Close parent issue** - Reference all child issues in closing comment

#### Example Decomposition
Instead of: "RAG Engine" (too broad)
Create:
- "Vector similarity search implementation" 
- "Context assembly and prompt formatting"
- "Citation tracking for source segments"
- "Metadata filtering during retrieval"

### Automated Backlog Analysis

#### Ready Task Identification
To find ready tasks, filter by:
```bash
gh issue list --label "status:ready" --label "P0-Foundation" --limit 5
```

#### Dependency Validation
Before starting work:
1. Check all dependencies are closed/completed
2. Verify required files/interfaces exist
3. Confirm configuration is available
4. Validate test environment setup

#### Progress Tracking
Update issue status immediately when:
- Starting work: Add `status:in-progress`, remove `status:ready`
- Completing work: Add `status:review`, remove `status:in-progress`  
- Finishing review: Close issue, update dependent issues to `status:ready`

### Validation Criteria

#### Issue Quality Checklist
Before creating an issue, verify:
- [ ] Title is specific and actionable
- [ ] Description includes concrete implementation details
- [ ] Dependencies are explicitly listed with issue numbers
- [ ] Acceptance criteria are testable and measurable
- [ ] Files to modify/create are specified
- [ ] Testing approach is defined
- [ ] Priority and status labels are applied

#### Ready Work Validation
Before starting an issue marked `status:ready`:
- [ ] All dependency issues are closed
- [ ] Required interfaces/types exist in codebase
- [ ] Necessary configuration is available
- [ ] Test utilities are accessible
- [ ] Implementation approach is clear from issue description

## Examples

### ✅ Well-Structured Issue
```markdown
# [STORAGE] Add blob expiration and cleanup

## Priority
**Priority Level:** P0-Foundation

## Dependencies  
- [ ] #76 - Create Vercel Blob storage integration

## Acceptance Criteria
- [ ] Automatic blob expiration after 30 days (configurable)
- [ ] Cleanup job removes expired blobs
- [ ] Metadata updated when blobs expire
- [ ] Error handling for cleanup failures

## Technical Implementation
**Files to Modify:**
- `src/lib/storage/blob.ts` - Add expiration logic to uploadTranscript
- `src/lib/config.ts` - Add expiration configuration

**New Files to Create:**  
- `src/lib/storage/cleanup.ts` - Blob cleanup utilities
```

### ❌ Poorly-Structured Issue
```markdown
# Fix storage stuff

Need to make storage better.

TODO:
- Add some features
- Make it faster
- Handle errors
```

## Automation Triggers

Claude should apply these guidelines when:
- User asks to "create an issue" or "add to backlog"
- User mentions breaking down complex features
- User requests backlog analysis or prioritization
- Creating sub-issues from complex parent issues
- Analyzing GitHub issue descriptions for missing information