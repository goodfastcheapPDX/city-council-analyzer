# Claude Code: Automated Code Review Prompt

## Initial Setup
**First, run `Read("CLAUDE.md")`** to load the project style guide. If this fails, continue without project-specific style rules and note this in the summary.

## Primary Command
```bash
git diff main...$(git branch --show-current) || git diff main...HEAD || git diff main
```

## Review Objectives (Priority Order)

### 1. **Critical Issues** (Must catch):
- Security vulnerabilities (auth bypasses, injection flaws, exposed secrets, unsafe deserialization)
- Logic errors that could cause data corruption or system failures
- Breaking API changes without deprecation warnings
- Memory safety issues and potential crashes

### 2. **High-Impact Issues** (Should catch):
- Performance bottlenecks (O(n²+) algorithms, N+1 queries, memory leaks, blocking async operations)
- Error handling gaps (unhandled exceptions, missing input validation, improper resource cleanup)
- Accessibility violations (missing alt text, keyboard navigation, ARIA labels)
- Race conditions and concurrency issues

### 3. **Code Quality Issues** (Nice to catch):
- Style guide violations from CLAUDE.md
- Readability problems (unclear variable names, complex nested logic >3 levels)
- Missing documentation for public APIs
- Inconsistent patterns or architectural deviations

### 4. **GitHub Issue Alignment**:
For commits referencing issues (e.g., "fixes #123", "closes #456"):
- Run `gh issue view <number>` to fetch issue details
- **Explicitly extract and document acceptance criteria**
- **Evaluate implementation against each criterion (Satisfied/Partial/Not Addressed)**
- Flag any requirements that appear unaddressed
- Note if implementation differs significantly from issue description

## Efficiency Guidelines
- **Skip commenting on**: formatting-only changes, test snapshots, auto-generated code, lock files
- **Focus on**: new business logic, security-sensitive areas, performance-critical paths
- **Prioritize**: issues that could impact production over minor style inconsistencies

## File Filtering Rules
**Ignore files matching these patterns:**
- `dist/**`, `build/**`, `*.min.*`, `*.lock`, `*.snap`, `*.ico`
- `vendor/**`, `**/node_modules/**`, `*.pb.go`, `*.generated.*`
- `package-lock.json`, `Cargo.lock`, `yarn.lock`, `*.bundle.js`

**Also ignore hunks with >500 added lines** to focus on reviewable changes.

> **Minimalism Guard**  
> If the plan or phase under review would exceed **25 % of the complexity budget**  
> (► 200 net LOC, ► 2 new dependencies, ► 0 new cloud services) **or** violates any MVP/YAGNI Gate,  
> **STOP**. Ask the user which tasks to drop or defer before proceeding.

## Required Output Structure

Write the following to **`pr_review.md`** in the repository root:

```markdown
# Code Review for <BRANCH_NAME>

## Summary
(A concise paragraph describing the overall change, scope, and general quality)

## GitHub Issues Analysis
*(Include this section only if commits reference GitHub issues)*

### Issue #<NUMBER>: <TITLE>
**Acceptance Criteria:**
- [ ] Criterion 1: **Satisfied/Partial/Not Addressed** - Brief explanation
- [ ] Criterion 2: **Satisfied/Partial/Not Addressed** - Brief explanation
- [ ] Criterion 3: **Satisfied/Partial/Not Addressed** - Brief explanation

**Overall Issue Completion:** X% complete

*(Repeat for each referenced issue)*

## Issues
| Severity | File | Line | Description | Suggested Fix |
|----------|------|------|-------------|---------------|
| critical | src/auth.ts | 88 | SQL injection vulnerability in user query | Use parameterized queries |
| high | src/api.ts | 156 | Unhandled promise rejection | Add .catch() handler |

**Limit to the 20 most important issues, prioritized by severity.**

## Scores
**Scoring Scale:** 5=excellent, 4=good, 3=acceptable, 2=needs improvement, 1=major issues

- **Readability:** X/5 (Code clarity and maintainability)
- **Correctness:** X/5 (Absence of bugs and logical errors)  
- **Performance:** X/5 (Efficiency and resource usage)
- **Style Guide Adherence:** X/5 (Compliance with project standards)

## Next Steps
- Action item 1
- Action item 2
- Action item 3
- Action item 4
- Action item 5

*(Maximum 5 bullet points, prioritized by importance)*
```

## Troubleshooting Guide

**If commands fail:**
- `git diff` fails → Use `git log --oneline -10` to review recent commits instead
- `Read("CLAUDE.md")` fails → Continue without project style guide, note in summary
- `gh issue view` fails → Skip GitHub integration, focus on code-only review

**If diff is too large:**
- Process files in order of criticality: `src/` > `tests/` > `config/` > `docs/`
- Focus on `.ts/.js/.py/.go/.rs/.java/.cpp` files over configuration
- Skip files with >500 lines changed, note in summary

**Special cases:**
- Empty diff → Output: "No changes detected between branches"
- Only whitespace/formatting changes → Note: "Changes are primarily formatting"
- Binary files in diff → Skip and note: "Binary files excluded from review"
- No issues found → Include empty table with header row and note "No significant issues identified"

**GitHub API issues:**
- Rate limiting → Continue without issue details, note in Next Steps
- Private repos without access → Skip issue fetching, focus on code review
- Issue numbers in commits but no `gh` CLI → Note missing GitHub integration

**Output validation:**
- Always ensure `pr_review.md` is valid Markdown
- Verify all table rows have exactly 5 columns
- If GitHub Issues Analysis section is empty, omit it entirely
- Ensure acceptance criteria use consistent formatting with checkboxes

## Final Instructions
- Make no remarks beyond the structured output
- Focus on actionable feedback
- Be concise but specific in descriptions
- Always create the `pr_review.md` file, even for empty reviews
```

This complete prompt provides comprehensive guidance for automated code reviews while ensuring consistent, actionable output and robust error handling for common edge cases.