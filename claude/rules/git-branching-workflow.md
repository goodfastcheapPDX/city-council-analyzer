# Git Branching Workflow Guidelines

## Purpose
This rule establishes a structured git branching workflow with GitHub review cycles to ensure code quality, maintainability, and collaborative development standards.

## When to Apply
Apply this rule for:
- All feature development and bug fixes
- GitHub issue implementation
- Code reviews and pull request creation
- Branch management and merging decisions
- Release preparation and deployment

## Core Branching Strategy

### Branch Types and Naming Conventions

#### Main Branches
- **`main`** - Production-ready code, always deployable
- **`develop`** - Integration branch for feature development (optional for this project size)

#### Feature Branches
- **Pattern**: `feature/issue-{number}-{short-description}`
- **Examples**: 
  - `feature/issue-111-enhance-dateutils-luxon`
  - `feature/issue-92-search-parameter-validation`
  - `feature/issue-76-blob-versioning-system`

#### Bug Fix Branches
- **Pattern**: `fix/issue-{number}-{short-description}`
- **Examples**:
  - `fix/issue-120-api-parameter-defaults`
  - `fix/issue-118-blob-path-sanitization`

#### Hotfix Branches
- **Pattern**: `hotfix/{critical-issue-description}`
- **Examples**: `hotfix/security-vulnerability-fix`

#### Documentation/Chore Branches
- **Pattern**: `docs/{description}` or `chore/{description}`
- **Examples**: 
  - `docs/update-testing-guidelines`
  - `chore/eslint-config-update`

### Branch Lifecycle Workflow

#### 1. Branch Creation
```bash
# Start from main branch
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/issue-111-enhance-dateutils-luxon

# Push branch to establish remote tracking
git push -u origin feature/issue-111-enhance-dateutils-luxon
```

#### 2. Development Process
```bash
# Regular commits following conventional commit standards
git add [files]
git commit -m "feat(config): implement luxon-backed dateUtils.now() method

Add Luxon DateTime integration to dateUtils.now() function
to replace native Date object usage. This provides consistent
timezone-aware timestamp generation across the application.

Part of date standardization initiative for Issue #111.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push changes regularly
git push origin feature/issue-111-enhance-dateutils-luxon
```

#### 3. Keep Branch Updated
```bash
# Regularly sync with main to avoid conflicts
git checkout main
git pull origin main
git checkout feature/issue-111-enhance-dateutils-luxon
git rebase main

# Or use merge if rebase is complex
git merge main
```

#### 4. Pre-Pull Request Validation
```bash
# Before creating PR, ensure all quality checks pass
npm run typecheck
npm run lint
npm run test
npm run test:coverage

# Fix any issues before proceeding
```

## Pull Request Standards

### PR Creation Requirements

#### PR Title Format
```
[TYPE] Issue #XXX: Brief description

Examples:
[FEAT] Issue #111: Enhance dateUtils with Luxon backing
[FIX] Issue #120: Correct API parameter default handling
[DOCS] Issue #125: Add comprehensive testing guidelines
```

#### PR Description Template
```markdown
## Issue Reference
Closes #XXX

## Summary
Brief description of changes and their purpose.

## Changes Made
- [ ] Specific change 1
- [ ] Specific change 2
- [ ] Specific change 3

## Testing
- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Property-based tests updated if applicable
- [ ] Integration tests verified

## Quality Checklist
- [ ] TypeScript compilation successful (`npm run typecheck`)
- [ ] ESLint checks pass (`npm run lint`)
- [ ] Test coverage maintained or improved
- [ ] Documentation updated if needed

## Review Notes
Any specific areas that need reviewer attention or architectural decisions made.

🤖 Generated with [Claude Code](https://claude.ai/code)
```

### Review Process

#### Reviewer Responsibilities
1. **Code Quality Review**
   - Verify adherence to project conventions
   - Check implementation follows TDD principles
   - Validate property-based testing where applicable
   - Ensure error handling is comprehensive

2. **Architecture Review**
   - Verify changes align with project architecture
   - Check integration patterns match existing code
   - Validate dependency injection usage
   - Ensure separation of concerns

3. **Testing Review**
   - Verify test coverage meets requirements (80%+)
   - Check test quality and meaningfulness
   - Validate property-based tests are effective
   - Ensure tests follow TDD methodology

#### Review Approval Criteria
- [ ] All quality checks pass (typecheck, lint, tests)
- [ ] Code follows project conventions and guidelines
- [ ] Implementation is well-tested with appropriate coverage
- [ ] Changes are well-documented and clear
- [ ] No introduction of technical debt
- [ ] Performance impact is acceptable

#### GitHub Review Settings
```yaml
# .github/CODEOWNERS (optional)
* @project-maintainer

# Branch protection rules (configure in GitHub)
- Require pull request reviews before merging: ✅
- Require status checks to pass: ✅
  - typecheck
  - lint
  - test
- Require branches to be up to date: ✅
- Restrict pushes to matching branches: ✅
```

## Merge Strategies

### Merge Options by Branch Type

#### Feature Branches
**Strategy**: Squash and merge (recommended)
- Creates clean, linear history
- Combines all feature commits into single commit
- Maintains issue tracking in commit message

```bash
# Example squash merge result
feat(config): enhance dateUtils with Luxon backing implementation

Implement comprehensive Luxon-based date utilities to replace
native Date object usage throughout the application.

- Add timezone-aware timestamp generation
- Implement type-safe date conversion utilities
- Maintain backward compatibility with existing API
- Add comprehensive test coverage with property-based testing

Closes #111

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### Hotfix Branches
**Strategy**: Regular merge (preserve individual commits)
- Maintains detailed history for critical fixes
- Easier to track specific changes in emergency situations

#### Documentation/Chore Branches
**Strategy**: Squash and merge
- Keeps history clean for non-functional changes

### Post-Merge Cleanup
```bash
# After successful merge, clean up branches
git checkout main
git pull origin main
git branch -d feature/issue-111-enhance-dateutils-luxon
git push origin --delete feature/issue-111-enhance-dateutils-luxon
```

## Workflow Automation

### GitHub Actions Integration
```yaml
# .github/workflows/pr-checks.yml
name: Pull Request Checks
on:
  pull_request:
    branches: [ main ]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
      - run: npm run test:coverage
```

### Automated Issue Updates
- Link PRs to issues using "Closes #XXX" in PR description
- Automatically close issues when PRs are merged
- Update project boards with PR status changes

## Exception Handling

### Emergency Hotfixes
For critical production issues:
1. Create hotfix branch directly from main
2. Implement minimal fix with focused testing
3. Create PR with expedited review process
4. Merge directly to main after single approval
5. Backport to develop branch if using git-flow

### Large Feature Development
For complex features spanning multiple days:
1. Consider breaking into smaller, reviewable chunks
2. Use draft PRs for early feedback
3. Regular rebasing to stay current with main
4. Coordinate with team to avoid blocking others

## Validation Criteria

When applying this workflow:
- [ ] Branch names follow established conventions
- [ ] All commits use conventional commit format
- [ ] PRs include comprehensive descriptions and checklists
- [ ] Quality checks pass before requesting review
- [ ] Review process is thorough and documented
- [ ] Merge strategy is appropriate for change type
- [ ] Post-merge cleanup is performed

## Integration with Project Rules

### TDD Workflow Integration
- Feature branches must include failing tests first
- Commits show clear red-green-refactor progression
- Property-based testing requirements documented in PRs

### Issue Management Integration
- Branch names reference specific GitHub issues
- PR descriptions link to issue requirements
- Acceptance criteria from issues verified in review

### Commit Standards Integration
- All commits follow conventional commit format
- Detailed commit messages explain architectural decisions
- Claude Code attribution included in all commits

## Benefits

### Code Quality
- Systematic review process ensures high standards
- Automated checks prevent common errors
- Property-based testing integration catches edge cases

### Collaboration
- Clear branching conventions improve team coordination
- Structured review process facilitates knowledge sharing
- Documentation requirements improve code understanding

### Project Management
- Issue integration provides clear development tracking
- PR process ensures requirements are met
- Automated workflows reduce manual overhead

### Risk Management
- Feature isolation prevents main branch corruption
- Review process catches issues before deployment
- Systematic testing requirements ensure reliability