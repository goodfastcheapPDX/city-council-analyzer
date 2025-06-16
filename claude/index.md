# Claude Instructions Directory

This directory contains specialized instructions and guidance for Claude Code when working with this repository.

## Purpose

The `claude/` directory serves as a knowledge base for Claude Code instances, providing:

- **Project-specific rules** for consistent development practices
- **Automated guidance** for complex or repetitive tasks
- **Context preservation** across different Claude Code sessions
- **Best practices** tailored to this codebase's architecture and patterns

## Directory Structure

```
claude/
├── index.md                    # This file - directory overview
├── rule-management.md          # Instructions for managing rules
└── rules/                      # Individual rule files
    ├── backlog-management.md   # Issue creation and management guidelines
    └── [other-rule-files].md   # Additional project rules
```

## How Rules Work

Claude Code will automatically read and apply rules from the `rules/` directory when:
- Starting work on new features or issues
- Making architectural decisions
- Creating new components or files
- Following project-specific patterns

## Rule Categories

Rules are organized by category:
- **Development practices** - Code style, architecture patterns
- **Issue management** - Backlog creation, task breakdown
- **Testing strategies** - Property-based testing, contract testing
- **Documentation standards** - README updates, code comments
- **Deployment procedures** - Release processes, environment setup

## Maintenance

Rules should be:
- ✅ **Kept current** with project evolution
- ✅ **Specific and actionable** rather than generic advice
- ✅ **Focused on automation** to reduce manual decision-making
- ✅ **Consistent** with existing project patterns
- ✅ **Documented with examples** for clarity

See `rule-management.md` for detailed instructions on creating and maintaining rules.