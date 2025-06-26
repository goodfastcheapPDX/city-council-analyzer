# Claude Code: Workstream Planning from GitHub Issue

## Command Usage
`/prep-workstream <issue_number>`

Example: `/prep-workstream #114` or `/prep-workstream 114`

## Initial Setup
**First, run `Read("CLAUDE.md")`** to understand project structure and conventions. If this fails, continue with generic planning approach.

## Primary Commands
```bash
# Extract issue number from parameter (remove # if present)
ISSUE_NUM=$(echo "$1" | sed 's/#//')

# Fetch issue details
gh issue view $ISSUE_NUM --json title,body,labels,assignees,milestone,comments

# Create todos directory if it doesn't exist
mkdir -p claude/todos
```

## Planning Objectives

### 1. **Requirements Analysis**
- Extract and clarify all functional requirements
- Identify non-functional requirements (performance, security, accessibility)
- Parse acceptance criteria into testable conditions
- Flag any ambiguous or incomplete requirements

### 2. **Technical Assessment**
- Analyze affected systems and components
- Identify integration points and dependencies
- Assess technical complexity and risks
- Determine required expertise/skills

### 3. **Work Breakdown**
- Decompose into logical, implementable phases
- Sequence tasks based on dependencies

### 4. **Risk & Dependency Analysis**
- Identify external dependencies (APIs, services, teams)
- Flag potential blockers and mitigation strategies
- Assess impact on existing functionality
- Note testing and deployment considerations

### 5. **Workflow Strategy Planning**
Apply development-workflow-strategy.md guidelines:
- **Dependency Analysis:** What must complete first vs parallel opportunities?
- **Branch Strategy:** Single vs multiple branches based on complexity/coordination?
- **Commit Planning:** Logical batching points (phase completion, feature units)
- **Parallel Development:** Identify concurrent work streams and coordination needs

### 6. **Branch Strategy**
- Generate appropriate branch name following conventions
- Consider issue type, scope, and naming patterns
- Determine if multiple branches needed for coordination
- Ensure branch name is descriptive and follows team standards

## Required Output Structure

Write the following to **`claude/todos/workstream_plan_<issue_number>.md`**:

```markdown
# Workstream Plan: Issue #<NUMBER>

## Branch Information
**Recommended Branch Name:** `<branch-type>/<issue-number>-<descriptive-name>`

Example: `feature/114-user-authentication-system`

**Branch Creation Commands:**
```bash
git checkout main && git pull origin main && git checkout -b <recommended-branch-name>
```

## Issue Overview
**Title:** <Issue Title>
**Priority:** <Label-based priority or milestone>
**Assignee:** <Current assignee or "Unassigned">
**Issue URL:** <GitHub issue link>

### Requirements Summary
*(2-3 sentence summary of what needs to be built)*

### Acceptance Criteria
- [ ] Criterion 1: <Specific, testable condition>
- [ ] Criterion 2: <Specific, testable condition>  
- [ ] Criterion 3: <Specific, testable condition>

## Technical Analysis

### Affected Components
- (these are just examples...)
- **Frontend:** <Components/pages that need changes>
- **Backend:** <Services/APIs that need changes>
- **Database:** <Schema changes, migrations needed>
- **Infrastructure:** <Deployment, configuration changes>

### Key Dependencies
- **Internal:** <Other teams, services, or features>
- **External:** <Third-party APIs, libraries, services>
- **Blocking:** <Must be completed before this work>

### Risk Assessment
| Risk | Impact | Likelihood | Mitigation |
|------|---------|------------|------------|
| API integration fails | High | Medium | Build mock service for testing |
| Performance impact | Medium | Low | Load testing in staging |

## Work Breakdown

### Phase 1: Foundation (Estimated: <Total effort>)
- [ ] **Task 1** - <Description>
  - **Details:** <Implementation notes>
  - **Dependencies:** <What must be done first>
  - **Definition of Done:** <Specific completion criteria>

- [ ] **Task 2** - <Description>
  - **Details:** <Implementation notes>
  - **Dependencies:** <What must be done first>
  - **Definition of Done:** <Specific completion criteria>

### Phase 2: Core Implementation (Estimated: <Total effort>)
- [ ] **Task 3** - <Description>
  - **Details:** <Implementation notes>
  - **Dependencies:** <What must be done first>
  - **Definition of Done:** <Specific completion criteria>

### Phase 3: Integration & Testing (Estimated: <Total effort>)
- [ ] **Task 4** - <Description>
  - **Details:** <Implementation notes>
  - **Dependencies:** <What must be done first>
  - **Definition of Done:** <Specific completion criteria>

## Effort Estimation
- **Total Estimated Effort:** <Sum of all tasks>
- **Critical Path Duration:** <Longest dependency chain>
- **Parallelizable Work:** <Tasks that can run concurrently>
- **Team Size Recommendation:** <Number of developers>

## Testing Strategy
- **Unit Tests:** <What needs unit test coverage>
- **Integration Tests:** <What integration points to test>
- **E2E Tests:** <User workflows to validate>
- **Performance Tests:** <Load/stress testing requirements>
- **Property Tests:** <What can we test in terms of general laws and mathematical properties>

## Deployment Plan
- [ ] **Development:** <Dev environment setup/changes>
- [ ] **Staging:** <Staging validation approach>
- [ ] **Production:** <Rollout strategy, feature flags>
- [ ] **Rollback Plan:** <How to revert if issues arise>

## Success Metrics
- **Functional:** <How to measure feature success>
- **Performance:** <Response times, throughput targets>
- **User Experience:** <UX metrics to track>

## Branch Workflow
1. **Create branch:** `git checkout -b <recommended-branch-name>`
2. **Regular commits:** Use conventional commit format
3. **Push frequently:** `git push -u origin <branch-name>`
4. **Draft PR early:** Create draft PR for visibility
5. **Final review:** Convert to ready for review when complete

## Next Actions
1. **Immediate (Next 1-2 days):**
   - Create the recommended branch
   - Set up development environment
   - Action item 2

2. **Short-term (This week):**
   - Action item 3
   - Action item 4

3. **Before Implementation:**
   - Action item 5
```

## Branch Naming Conventions

**Format:** `<type>/<issue-number>-<short-description>`

**Naming Rules:**
- Use kebab-case (lowercase with hyphens)
- Keep description under 30 characters
- Be descriptive but concise
- Avoid special characters except hyphens

## Troubleshooting Guide

**If commands fail:**
- `gh issue view` fails → Use issue number directly, ask user to provide details
- Issue doesn't exist → Output error and suggest checking issue number
- No repository access → Create generic plan template
- `claude/todos` directory creation fails → Use current directory as fallback

**For large/complex issues:**
- Break into multiple phases with clear deliverables
- Focus on MVP first, then enhancements
- Identify what can be done incrementally
- Consider splitting into multiple branches/PRs

**Missing information:**
- Flag unclear requirements for stakeholder clarification
- Make reasonable assumptions and document them
- Suggest follow-up questions for product/design teams

**Branch naming conflicts:**
- Check existing branches with `git branch -a`
- Add suffix like `-v2` or `-alt` if name exists
- Suggest alternative descriptive names

**Output validation:**
- Ensure all task sizes are specified
- Verify dependency chains make logical sense
- Check that acceptance criteria map to specific tasks
- Confirm branch name follows conventions

## Final Instructions
- Always save to `claude/todos/` directory
- Be specific and actionable in task descriptions
- Include concrete definition of done for each task
- Highlight any assumptions made due to unclear requirements
- Focus on implementable work breakdown, not just analysis
- Always create the workstream plan file, even for unclear issues
- Provide ready-to-use git commands for branch creation
