# Claude Code: Pickup and Execute Workstream Phase

> **Minimalism Guard**  
> If the plan or phase you’re about to generate would exceed **25 % of the complexity budget**  
> (► 200 net LOC, ► 2 new dependencies, ► 0 new cloud services) **or** violates any MVP/YAGNI Gate,  
> **STOP**. Ask the user which tasks to drop or defer before proceeding.

## Command Usage
`/pickup <issue_number>`

Example: `/pickup #114` or `/pickup 114`

## Initial Setup
```bash
# Extract issue number from parameter (remove # if present)
ISSUE_NUM=$(echo "$1" | sed 's/#//')

# Find the workstream plan file
PLAN_FILE="claude/todos/workstream_plan_${ISSUE_NUM}.md"

# Verify file exists
if [ ! -f "$PLAN_FILE" ]; then
    echo "Error: No workstream plan found for issue #${ISSUE_NUM}"
    echo "Run /prep-workstream ${ISSUE_NUM} first"
    exit 1
fi
```

## Execution Principles

### **CRITICAL BOUNDARIES:**
1. **Phase Scope Only:** Work ONLY on tasks within the identified phase
2. **No Phase Jumping:** Do NOT automatically proceed to next phase when current phase completes
3. **Task Boundaries:** Complete tasks fully before moving to next task in same phase
4. **Progress Tracking:** Update todo file with completed tasks, but do NOT mark phase as complete
5. **Stop and Report:** When phase is complete, stop and report status

### **WORKFLOW STRATEGY INTEGRATION:**
Apply development-workflow-strategy.md guidelines:
6. **Commit Batching:** Complete logical units before committing (tests + implementation + docs)
7. **Phase-Based Commits:** Aim for one comprehensive commit per completed phase
8. **Parallel Work Awareness:** Check for and coordinate with concurrent development streams
9. **Branch Management:** Use appropriate branch structure based on complexity and coordination needs

## Phase Identification Process

### 1. **Read Current Plan**
```bash
# Display current plan file
cat "$PLAN_FILE"
```

### 2. **Identify Active Phase**
Priority order for phase selection:
1. **Incomplete Phase with Started Tasks** (has ✓ but also unchecked tasks)
2. **First Phase with All Unchecked Tasks** (ready to start)
3. **If all phases complete:** Report completion status

### 3. **Parse Phase Tasks**
Extract tasks from the identified phase:
- Task description and size
- Dependencies and prerequisites  
- Definition of Done criteria
- Implementation details

## Execution Workflow

### **Phase Start Protocol:**
1. **Announce Phase:** "Starting work on [Phase Name] for Issue #[NUMBER]"
2. **List Phase Tasks:** Show all tasks in this phase with current status
3. **Identify Next Task:** Select first unchecked task with satisfied dependencies
4. **Verify Prerequisites:** Ensure all dependencies are met

### **Task Execution:**
1. **Task Start:** Announce which specific task is being worked on
2. **Implementation:** Execute the task according to its details and Definition of Done
3. **Testing:** Verify task completion meets DoD criteria
4. **Documentation:** Update relevant docs/comments as needed
5. **Task Complete:** Mark task as complete in todo file

### 🔔 Demo Check
After completing the phase, create a minimal manual test (CLI or curl) that proves the skateboard rolls.
Do NOT begin the next phase until a human or CI job runs that demo.

### **Phase Boundaries:**
- **NEVER** work on tasks from other phases
- **NEVER** automatically start next phase
- **ALWAYS** stop when current phase is complete
- **ALWAYS** update progress in todo file

## Required Actions During Execution

### **Before Starting Any Work (Workflow Strategy Checklist):**
1. **Dependency Analysis:** Review what must complete first vs parallel opportunities
2. **Branch Strategy:** Determine if single vs multiple branches needed for coordination
3. **Commit Planning:** Plan logical commit batching points (phase completion, logical units)
4. **Parallel Work Check:** Identify any concurrent development streams to coordinate with
5. Read the branch information from the plan
6. Verify you're on the correct branch (or create it if needed)
7. Ensure development environment is ready
8. Check that all phase dependencies are satisfied

### **During Task Execution:**
1. Follow the implementation details exactly as specified
2. Respect the Definition of Done for each task
3. Write clean, well-documented code
4. Create appropriate tests as specified
5. **Batch related changes:** Group tests + implementation + documentation together
6. **Coordinate parallel work:** Check for conflicts with concurrent development streams
7. Commit logical units following development-workflow-strategy.md guidelines

### **After Each Task:**
1. Update the todo file to mark task as complete: `- [x] **Task Name**`
2. **Evaluate commit strategy:** 
   - Individual task commit vs batched with related tasks
   - Consider phase completion for comprehensive commit
3. Commit changes following workflow strategy guidelines
4. Push changes to the branch
5. Verify task completion against Definition of Done

## Status Reporting Format

### **Phase Start Report:**
```markdown
## 🚀 Starting Phase: [Phase Name] for Issue #[NUMBER]

**Branch:** [branch-name]
**Phase Tasks:** [X] total, [Y] completed, [Z] remaining

### Current Task
**Task:** [Task Name] (Size: [S/M/L])
**Description:** [Task description]
**Dependencies:** [List any prerequisites]
**Definition of Done:** [Completion criteria]

### Phase Scope
- Task 1: [Status]
- Task 2: [Status]  
- Task 3: [Status]

**Estimated Phase Completion:** [Timeline based on remaining tasks]
```

### **Task Completion Report:**
```markdown
## ✅ Task Completed: [Task Name]

**What was done:**
- [Bullet point summary of work]
- [Files modified/created]
- [Tests added/updated]

**Verification:**
- [x] Meets Definition of Done
- [x] Tests passing
- [x] Code reviewed/self-reviewed
- [x] Documentation updated

**Next:** [Next task in phase OR "Phase complete"]
```

### **Phase Completion Report:**
```markdown
## 🎉 Phase Complete: [Phase Name] for Issue #[NUMBER]

**Summary:**
- [X] tasks completed
- [Y] files modified
- [Z] tests added
- [Commit count] commits made

**Key Deliverables:**
- [Major outcomes of this phase]
- [Features/fixes implemented]
- [Documentation created]

**Workflow Strategy Applied:**
- **Commit Strategy:** [Single phase commit / Batched logical units / Individual tasks]
- **Branch Coordination:** [Single branch / Coordinated with parallel branches]
- **Parallel Work:** [None / Coordinated with: branch names]

**Ready for:** [Next phase name]
**Action Required:** Run `/pickup [issue_number]` to continue with next phase
```

## File Update Protocol

### **Todo File Updates:**
1. **Task Completion:** Change `- [ ]` to `- [x]` for completed tasks
2. **Progress Notes:** Add brief notes about implementation details
3. **Timestamp:** Add completion timestamp to completed tasks
4. **Phase Status:** Update phase progress summary

## Error Handling

### **Missing Prerequisites:**
- **Stop execution** if dependencies aren't met
- **Report** what's missing and how to resolve
- **Do NOT** attempt to resolve dependencies from other phases

### **Unclear Tasks:**
- **Ask for clarification** rather than making assumptions
- **Document** the ambiguity in the todo file
- **Suggest** specific questions to resolve with stakeholders

### **Technical Blockers:**
- **Document** the blocker in the todo file
- **Suggest** potential solutions or workarounds
- **Do NOT** move to other tasks until blocker is resolved

### **Scope Creep Prevention:**
- **Reject** any work that extends beyond current phase
- **Document** additional requirements for future phases
- **Stay focused** on current phase objectives only

## Troubleshooting Guide

**If workstream plan not found:**
- Check if issue number is correct
- Verify `/prep-workstream` was run first
- List available workstream files: `ls claude/todos/workstream_plan_*.md`

**If no clear next phase:**
- Review all phases for incomplete tasks
- Check if all phases are complete (celebrate!)
- Verify task dependencies are correctly specified

**If branch doesn't exist:**
- Use branch creation commands from the workstream plan
- Verify branch naming matches the plan
- Check if branch exists remotely: `git branch -r`

**If tasks are unclear:**
- Refer back to original GitHub issue for context
- Document specific questions in todo file
- Ask for stakeholder clarification rather than guessing

## Final Instructions
- **Stay within phase boundaries at all costs**
- **Update progress continuously**
- **Commit work incrementally**
- **Stop when phase is complete**
- **Report status clearly**
- **Ask for clarification when in doubt**
- **Never assume or extend scope**
```

This command provides a structured way to execute workstream phases while maintaining strict boundaries to prevent scope creep and ensure focused, incremental progress.