# Development Workflow Strategy Guidelines

## Purpose
This rule provides guidance for efficient development workflow decisions including commit batching, branch management, and parallel development planning to optimize development velocity while maintaining code quality.

## When to Apply
Apply this rule when:
- Starting work on GitHub issues or feature development
- Making decisions about commit granularity and batching
- Planning branch structure for complex issues
- Coordinating multiple concurrent development streams
- Managing documentation and cleanup task timing

## Core Workflow Principles

### 1. Commit Batching Strategy

#### Batch Related Changes
```bash
# ✅ Good: Batch related changes in single commit
feat(storage): complete Supabase migration with 3-phase implementation

- Phase 1: Infrastructure setup and configuration
- Phase 2: Core API migration and testing
- Phase 3: Cleanup and documentation updates

Closes #130

# ❌ Avoid: Over-granular commits for single feature
feat(storage): phase 1 infrastructure setup
feat(storage): phase 2 API migration  
feat(storage): phase 3 cleanup
```

#### Commit Batching Guidelines
- **Single logical unit**: Batch changes that form one complete logical operation
- **Test-driven batching**: Include test + implementation + documentation in one commit
- **Phase completion**: Complete entire phase before committing rather than incremental progress
- **Maximum batch size**: Keep commits under 500 lines changed to maintain reviewability

#### When to Separate Commits
- **Different functional areas**: Storage changes vs API changes vs frontend changes
- **Breaking changes**: Separate breaking changes for easier rollback
- **Complex refactoring**: Major architectural changes deserve separate commits
- **Bug fixes**: Separate fixes from feature development

### 2. Branch Management Strategy

#### Single Branch per Issue (Default)
```bash
# ✅ Preferred: Single branch for entire issue
feature/issue-112-date-standardization

# ❌ Avoid: Multiple branches for single issue unless justified
feature/issue-112-1-blob-storage-dates
feature/issue-112-2-metadata-validation-dates  
feature/issue-112-3-test-fixes-date-format
feature/issue-112-4-normalize-record-method
```

#### When Multiple Branches Are Justified
- **Parallel sub-implementations**: Independent components that can be developed simultaneously
- **Dependency experimentation**: Testing different approaches before committing to one
- **Review cycle management**: Breaking large changes into reviewable chunks
- **Risk isolation**: Separating high-risk changes from stable implementations

#### Branch Naming for Multi-Branch Issues
```bash
# When multiple branches are needed, use descriptive suffixes
feature/issue-112-date-standardization        # Main integration branch
feature/issue-112-storage-layer              # Storage-specific changes
feature/issue-112-api-layer                  # API-specific changes
```

### 3. Parallel Development Planning

#### Identify Parallel Work Opportunities
Before starting sequential issue implementation, analyze dependencies:

```markdown
## Dependency Analysis Example
- Issue #111 (dateUtils foundation) → Must complete first
- Issue #112 (storage dates) → Depends on #111
- Issue #113 (API dates) → Depends on #111, independent of #112
- Issue #115 (test refactoring) → Independent of #112-113

## Parallel Streams
Stream A: #111 → #112
Stream B: #111 → #113  
Stream C: #115 (can start immediately)
```

#### Infrastructure vs Application Work
- **Infrastructure changes** (database, storage, configuration) can often run parallel
- **Application features** often have interdependencies
- **Testing improvements** usually independent of feature development
- **Documentation updates** can be batched and done in parallel

#### Coordination Strategies
- **Shared infrastructure**: Complete before parallel application work
- **Integration points**: Plan merge order and resolve conflicts early
- **Communication**: Document which work is happening in parallel

### 4. Phase-Based Development

#### Effective Phase Structure
Based on successful pattern from Issue #130:

```markdown
## Phase 1: Analysis and Planning
- Requirements analysis and dependency mapping
- Technical approach design and validation
- Risk assessment and mitigation planning
- Success criteria definition

## Phase 2: Core Implementation
- Primary functionality development
- Core tests and validation
- Integration with existing systems
- Performance and security validation

## Phase 3: Completion and Polish
- Edge case handling and error management
- Documentation updates and examples
- Cleanup and refactoring
- Final validation and handoff preparation
```

#### Phase Commit Strategy
- **One commit per completed phase** (preferred)
- **Phase completion criteria**: All tests pass, functionality complete, documentation updated
- **Phase dependencies**: Complete all tasks in phase before moving to next

### 5. Cleanup and Documentation Management

#### Batch Cleanup Tasks
```bash
# ✅ Good: Batch cleanup at logical milestones
docs: complete Issue #129 workstream and cleanup outdated todos

- Remove completed workstream plans (#115, #129)
- Update work-journal.md with final status
- Archive resolved documentation files

# ❌ Avoid: Frequent small cleanup commits
docs(todos): cleanup outdated todos for #99
docs(todos): cleanup outdated todos for #129  
docs: update session tracking
```

#### Documentation Update Timing
- **End of workstream**: Batch all documentation updates when completing major work
- **Weekly batching**: Collect documentation updates and commit weekly
- **Milestone completion**: Update documentation at project milestones
- **Never mid-feature**: Avoid documentation-only commits during active development

## Implementation Guidelines

### Complexity Budget:
- ≤200 net LOC per phase
- ≤2 external dependencies added per issue
- Zero new cloud services unless an acceptance criterion explicitly says so

### Pre-Work Planning Checklist
Before starting any GitHub issue:
- [ ] Analyze dependencies - what must complete first?
- [ ] Identify parallel work opportunities
- [ ] Plan branch structure (single vs multiple)
- [ ] Define phase structure and commit points
- [ ] Estimate batch size and complexity

### Development Execution Checklist
During implementation:
- [ ] Complete logical units before committing
- [ ] Batch related changes (tests + implementation + docs)
- [ ] Coordinate with parallel work streams
- [ ] Complete phases fully before moving to next
- [ ] Save cleanup tasks for batch processing

### Quality Gates
- [ ] Each commit represents complete, testable functionality
- [ ] Branch structure matches complexity and coordination needs
- [ ] Parallel work is properly coordinated and integrated
- [ ] Documentation updates are batched efficiently
- [ ] Overall development velocity is optimized

## Validation Criteria

When applying this workflow strategy:
- [ ] Commit history shows logical, reviewable units of work
- [ ] Branch structure matches issue complexity appropriately
- [ ] Parallel development opportunities have been identified and utilized
- [ ] Phase-based approach is used for complex implementations
- [ ] Cleanup and documentation tasks are batched efficiently

## Integration with Existing Rules

### With Git Commit Style
- Use conventional commit format for all batched commits
- Include comprehensive body explaining all changes in batch
- Reference all related issues and architectural decisions

### With Git Branching Workflow  
- Follow branch naming conventions even with multiple branches
- Use same PR and review process regardless of branch structure
- Apply same merge strategies based on change type

### With TDD Development
- Include test development in commit batching decisions
- Batch red-green-refactor cycles together when logical
- Ensure each commit maintains test coverage requirements

## Anti-Patterns to Avoid

1. **Micro-commits**: Committing every small change separately
2. **Branch proliferation**: Creating multiple branches without clear justification
3. **Sequential tunnel vision**: Missing parallel development opportunities
4. **Documentation noise**: Frequent small documentation-only commits
5. **Incomplete batches**: Committing partial implementations of logical units
6. **Phase blending**: Mixing phase work instead of completing phases fully

## Benefits

### Development Velocity
- Reduced context switching between related changes
- Better coordination of parallel development streams
- More efficient use of development time and resources

### Code Quality
- Commits represent complete, testable functionality
- Easier code review with logical change groupings
- Cleaner git history for future maintenance

### Project Management
- Clear progress tracking through phase completion
- Better coordination of concurrent work streams
- Reduced overhead from excessive branching and cleanup