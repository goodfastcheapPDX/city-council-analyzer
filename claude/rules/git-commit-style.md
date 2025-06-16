# Git Commit Style Guidelines

## Purpose
This rule provides automated guidance for creating consistent, informative git commits that maintain a clear repository narrative and follow conventional commit standards.

## When to Apply
Apply this rule when:
- User requests a git commit to be made
- User asks to "commit changes" or "save progress"
- Completing implementation of GitHub issues
- Making significant code changes that should be version controlled
- User mentions git, commits, or version control

## Implementation Guidelines

### Conventional Commit Format
All commit messages must follow this structure:
```
<type>(<scope>): <subject>

<body>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### Types
- **feat**: New feature implementation
- **fix**: Bug fix or error correction
- **docs**: Documentation changes (README, comments, CLAUDE.md)
- **style**: Code style changes (formatting, linting, no logic changes)
- **refactor**: Code restructuring without changing functionality
- **perf**: Performance improvements
- **test**: Adding, modifying, or fixing tests
- **chore**: Build process, dependencies, tooling changes
- **build**: Changes to build system or external dependencies
- **ci**: Changes to CI/CD configuration

#### Scope (Optional but Recommended)
Describes the section of the codebase affected:
- `(storage)` - Blob storage, database operations
- `(api)` - API routes and endpoints
- `(ui)` - Frontend components and interfaces
- `(auth)` - Authentication and authorization
- `(test)` - Testing utilities and configurations
- `(config)` - Configuration files and settings
- `(docs)` - Documentation updates
- `(backlog)` - Issue management and project organization

#### Subject Guidelines
- Use present tense ("add feature" not "added feature")
- No period at end
- First letter lowercase
- 50 characters or less
- Clear and specific description

#### Body Requirements
- Explain **what** and **why**, not how
- Wrap lines at 72 characters
- Use present tense consistently
- Include context and rationale for changes
- Reference related GitHub issues with `#issue-number`
- Explain architectural decisions
- Connect changes to project goals

#### Footer (Required for Claude Code)
Always include:
```
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Additional footer elements:
- `Closes #123` - For issues resolved by this commit
- `Refs #456` - For issues referenced but not closed
- `BREAKING CHANGE:` - For breaking API changes

### Change Analysis Process

Before writing commit messages:
1. **Analyze user request** - What was the original ask or GitHub issue?
2. **Identify scope of changes** - Which files and systems were modified?
3. **Understand intent** - Why were these changes necessary?
4. **Connect to project goals** - How do changes advance the transcript analysis system?
5. **Reference related work** - Link to GitHub issues, previous commits, or documentation

### Repository Narrative Standards

Each commit should:
1. **Tell a coherent story** - Clear progression of development
2. **Build upon previous work** - Reference foundations laid by earlier commits
3. **Explain decision-making** - Rationale for implementation choices
4. **Document architectural evolution** - How the system is growing and changing
5. **Maintain context** - Future developers should understand the reasoning

## Examples

### ✅ Excellent Commit Message
```
feat(storage): implement blob versioning and expiration

Add version management to TranscriptStorage class to support
transcript history and automatic cleanup. This addresses issue #76
by extending the existing blob storage with proper lifecycle
management as specified in the project configuration.

The implementation includes:
- Blob naming convention: transcripts/{sourceId}/v{version}/{timestamp}.json
- Automatic expiration after 30 days (configurable)
- Retry logic for failed operations
- Integration with existing Supabase metadata storage

This change enables the transcript upload UI to show version
history and allows users to recover from accidental overwrites.

Closes #76
Refs #75

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### ✅ Good Simple Commit Message
```
fix(api): add validation for empty transcript content

Prevent uploads of empty transcripts by validating content length
in the POST /api/transcripts endpoint. This addresses edge case
discovered during testing where empty strings bypassed validation.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### ❌ Poor Commit Message
```
fixed stuff

- added auth
- fixed bugs
- updated docs

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Automation Commands

When committing changes, use this pattern:
```bash
git add [files]
git commit -m "$(cat <<'EOF'
type(scope): clear subject line

Detailed explanation of what was changed and why.
Reference to GitHub issues and architectural decisions.
Connection to overall project goals.

Closes #123

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Validation Criteria

Before creating a commit, verify:
- [ ] Commit type is appropriate for the changes made
- [ ] Scope accurately reflects the modified system components
- [ ] Subject line is under 50 characters and descriptive
- [ ] Body explains the reasoning and context
- [ ] Related GitHub issues are referenced
- [ ] Claude Code footer is included
- [ ] Message tells a clear story about the change
- [ ] Architectural decisions are documented

## Common Patterns

### Issue Implementation
```
feat(storage): implement transcript blob cleanup job

Add scheduled cleanup functionality to remove expired transcript
blobs and associated metadata. This completes the storage lifecycle
management system started in #76.

Closes #XX
```

### Bug Fix
```
fix(api): handle missing sourceId in upload validation

Add proper error handling for requests missing sourceId field.
The validation schema now provides clear error messages for
missing required metadata fields.

Fixes #XX
```

### Documentation Update
```
docs: add backlog management guidelines to Claude rules

Create comprehensive issue creation standards in ./claude/rules/
to enable automated, consistent backlog management. This supports
the transition from TSV files to GitHub Projects workflow.

Refs #XX
```

### Test Addition
```
test(storage): add property-based tests for blob operations

Implement Fast-Check generative testing for TranscriptStorage
class methods. Tests cover edge cases like unicode content,
large files, and concurrent operations.

Improves test coverage for storage layer as required by #XX
```