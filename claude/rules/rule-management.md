# Claude Rule Management

## Rule: Claude Rule Organization
When creating new Claude rules for automated guidance:
1. Always create new Claude rules in the `./claude/rules` directory
2. Each rule should be in its own file with a `.md` extension
3. Use descriptive, kebab-case filenames (e.g., `backlog-management.md`, `api-testing-strategy.md`)
4. Include a clear title and description at the top of each rule file
5. Structure rules with clear sections using markdown headers
6. Keep rules focused and single-purpose
7. Reference other rules when needed using relative paths

## Rule: Claude Rule Content
Each Claude rule file should:
1. Start with a level 1 header (#) containing the rule name
2. Include a brief description of the rule's purpose and when it applies
3. Use level 2 headers (##) for major sections (When to Apply, Implementation, Examples)
4. Use level 3 headers (###) for subsections and specific scenarios
5. Include concrete examples with code snippets where helpful
6. Be written in clear, actionable language for automated application
7. Follow markdown best practices for readability

## Rule: Claude Rule Automation Triggers
Rules should specify clear triggers for when Claude should apply them:
1. **File patterns** - Apply when working with specific file types or locations
2. **Task types** - Apply when creating issues, implementing features, writing tests
3. **Project phases** - Apply during setup, development, testing, deployment
4. **User requests** - Apply when user asks for specific types of work
5. **Context patterns** - Apply based on existing code patterns or architecture

## Rule: Claude Rule Maintenance
When maintaining Claude rules:
1. Keep rules up to date with project evolution and new patterns
2. Remove obsolete rules that no longer apply
3. Update rules when project requirements or architecture changes
4. Ensure rules don't conflict with each other
5. Test rule effectiveness by observing Claude's application of them
6. Keep rule files focused and avoid overly broad guidance
7. Version control all rule changes with descriptive commit messages

## Rule: Claude Rule Documentation
Documentation requirements for automated application:
1. Each rule should include explicit **trigger conditions**
2. Provide **step-by-step instructions** that Claude can follow automatically
3. Include **decision trees** for complex scenarios
4. Show **before/after examples** of correct application
5. Specify **validation criteria** to check if rule was applied correctly
6. Link to related project files, patterns, or documentation
7. Keep instructions precise and unambiguous

## Rule: Claude Rule Examples
### Correct File Locations and Names
✅ `./claude/rules/backlog-management.md` - Correct location and descriptive name
✅ `./claude/rules/api-testing-strategy.md` - Correct location and specific scope
✅ `./claude/rules/component-creation.md` - Correct location and focused purpose
✅ `./claude/rules/error-handling-patterns.md` - Correct location and pattern-specific

### Incorrect File Locations and Names
❌ `./rules/backlog-management.md` - Wrong directory (should be in claude/rules)
❌ `./claude/rules/backlogManagement.md` - Wrong naming (should use kebab-case)
❌ `./claude/rules/backlog_management.md` - Wrong naming (should use kebab-case)
❌ `./claude/rules/BACKLOG-MANAGEMENT.MD` - Wrong casing (should be lowercase)
❌ `./claude/rules/backlog.md` - Too vague (should be specific)
❌ `./claude/rules/comprehensive-project-wide-development-and-testing-guidelines.md` - Too long
❌ `./claude/rules/backlog management.md` - Contains space (should use kebab-case)

## Rule: Automatic Rule Creation
Claude should automatically create new rules when:
1. **Patterns emerge** - When applying the same solution multiple times
2. **Complex decisions** - When facing multi-step decision trees repeatedly
3. **User feedback** - When user corrects or refines Claude's approach
4. **New project phases** - When entering new development stages
5. **Architecture evolution** - When project patterns or practices change

### Auto-Creation Process
When creating a new rule automatically:
1. **Identify the trigger** - What caused the need for this rule?
2. **Extract the pattern** - What specific steps or decisions should be automated?
3. **Write actionable instructions** - How should future Claude instances apply this?
4. **Include validation** - How can Claude verify correct application?
5. **Test immediately** - Apply the rule to validate it works as intended

### Best Practices for Auto-Created Rules
1. Keep filenames between 2-4 words
2. Use kebab-case for readability  
3. Be specific but not overly narrow
4. Focus on automation and decision-making
5. Include concrete examples and validation steps
6. Reference existing project files and patterns
7. Write rules that work across different Claude sessions