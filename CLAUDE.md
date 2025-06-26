# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application called "transcript-analysis-system" that manages city council transcript uploads, storage, and analysis. The system uses Vercel Blob Storage for file storage and Supabase for metadata persistence.

**For detailed architecture**: See @claude/architecture-plan.md

## Quick Reference

### Essential Commands
```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run lint             # Run ESLint

# Testing
npm run test             # Run all tests
npm run test:storage     # Run storage tests (sequential)
npm run test:coverage    # Run with coverage report
npm run test:api         # Run manual API endpoint tests
npm run typecheck        # Type check all TypeScript files

# Docker (for integration testing)
npm run docker:up        # Start test containers
```

### Key File Locations
```
src/
├── app/api/transcripts/     # Main API endpoints
├── lib/storage/             # Storage layer (blob + database)
├── lib/config.ts           # Application configuration
├── components/transcript/   # Upload and display components
└── __tests__/              # Test utilities and setup

claude/
├── architecture-plan.md    # Complete system architecture
├── implementation-roadmap.md # 48-issue development roadmap
└── rules/                  # Project-specific automation rules
```

### Core Architecture
- **Storage**: Vercel Blob (files) + Supabase (metadata + vectors)
- **Processing**: Multi-stage pipeline with job queue
- **AI/ML**: OpenAI embeddings + vector search + RAG pipeline
- **API**: RESTful endpoints + WebSocket for real-time updates

### Runtime Boundary Rules (Critical)
- **NEVER mix server and client runtime code in the same file**
- **Keep browser-specific imports separate from Node.js-specific imports**  
- **Use environment-specific factory patterns**: `factories/server.ts`, `factories/client.ts`, `factories/test.ts`
- **API Routes (`app/api/`)**: Only import server-side libraries and factories
- **Client Components**: Only import client-side libraries and factories
- **Shared Code**: Keep in separate files with no runtime dependencies (types only)

## Development Guidelines

### Development Methodology
- **Test-Driven Development (TDD)** - Always write tests before implementation
- **Red-Green-Refactor** cycle for all new functionality
- **Behavior specification** through tests, not implementation details

**For TDD guidelines**: See @claude/rules/test-driven-development.md

### Development Workflow
- **Commit batching** and **branch management** for optimal development velocity
- **Parallel development planning** to identify concurrent work opportunities
- **Phase-based implementation** for complex issues with clear milestones
- I keep the dev server running in a separate tab for efficiency.

**For workflow optimization guidelines**: See @claude/rules/development-workflow-strategy.md

### Testing Strategy
- **Property-based testing** with Fast-Check for edge cases
- **Realistic environments** over mocking (SQLite, Docker)
- **Sequential storage tests** (`--max-concurrency=1`)
- **80% coverage** minimum for all components

**For detailed testing guidance**: See @claude/rules/testing-strategy.md

### Property-Based Testing Guidance
- **Remember to reference the @claude/rules/property-based-testing-guide.md rule when planning tests and engaging in TDD**
- **Remember to check the @claude/rules/visual-testing-guide.md when planning tests or engaging in TDD**

### Testing Best Practices
- When writing unit tests, always reference the actual input data in the assertion instead of recreating logic or patterns emulating the input data. For example, `expect(actual.id).toMatch(input.id)`, not `expect(actual.id).toMatch(/some-regex-that-looks-like-input-id/)`

### Issue Management
- **Detailed specifications** required for all GitHub issues
- **Clear dependencies** and acceptance criteria
- **Property-based testing** requirements included
- **Use labels when creating github issues. if labels that make sense don't exist yet in the project, create new labels**

**For issue creation standards**: See @claude/rules/backlog-management.md

### Commit Standards
- **Conventional commits** with detailed explanations
- **Run typecheck before commits**: Always run `npm run typecheck` before committing
- **Claude Code attribution** footer required
- **No commits without explicit user request**
- **When making a commit reflecting task completion, update the LAST_TIME_NEXT_TIME.md file to record that**
- **You only need to run typecheck before the commit, not after**
- **Write to LAST_TIME_NEXT_TIME.md before making commits**

**For commit guidelines**: See @claude/rules/git-commit-style.md

## Environment Configuration

### Required Environment Variables
```bash
# Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key

# AI Services (for embeddings and analysis)
OPENAI_API_KEY=your_openai_key

# GitHub Integration
GITHUB_TOKEN=your_github_token
```

### Project Configuration
Key settings in @src/lib/config.ts:
- **Token limits**: 4000 max per segment, 200 overlap
- **Storage**: 30-day expiration, 10MB max file size
- **Processing**: Configurable quality levels and strategies

## Claude Rules System

This repository includes automated guidance in the @claude directory:

### When Claude Should Check Rules
- Starting work on GitHub issues
- Creating or updating project documentation  
- Making architectural decisions
- User requests that match rule patterns

### Available Rules
- `test-driven-development.md` - TDD methodology and best practices
- `testing-strategy.md` - Property-based testing approach
- `backlog-management.md` - Issue creation and dependency tracking
- `git-commit-style.md` - Commit message standards  
- `issue-modernization-plan.md` - Architectural alignment process

### Rule Discovery Process
1. Check `ls claude/rules/` for applicable rules
2. Read relevant rules with `Read` tool
3. Apply step-by-step instructions
4. Validate using rule-specific criteria

**For rule management**: See @claude/rule-management.md

## Implementation Status

### Phase 1: Foundation (P0) - Ready for Development
6 issues immediately implementable:
- Database schema and API middleware
- Blob storage and validation systems  
- Multi-format parsers and token counting

### Phase 2: Intelligence (P1) - Blocked by P0
6 issues for vector embeddings and search

### Phase 3: Analysis (P2) - Blocked by P1  
3 issues for RAG pipeline and LLM integration

**For complete roadmap**: See @claude/implementation-roadmap.md

## Key Constraints

### Performance Requirements
- API responses: <500ms typical, <2s maximum
- Token counting: <100ms estimation, <2s precise
- Vector search: <200ms with caching
- File processing: <30s for 10MB transcripts

### Quality Standards
- Test coverage: 80% minimum across all metrics
- Parsing accuracy: >98% for supported formats
- Search relevance: >90% user satisfaction
- Error recovery: >95% automatic resolution

### Security
- Private blob access by default
- RLS policies for all database operations
- API key authentication required
- CORS configured for production domains

## Session Coordination

### Development Session Tracking
- **@LAST_TIME_NEXT_TIME.md**: Session coordination file that maintains continuity across development sessions:
  - **"Last Time" section**: Documents what was accomplished in the previous session
  - **"Current Status"**: Tracks project state with clear ✅/❌ indicators
  - **"Next Time" tasks**: Lists specific actionable priorities for the upcoming session
  - **Testing commands**: Provides ready-to-run validation commands
  - **Current issues**: Notes blockers and bugs that need resolution
  
This approach ensures no time is wasted figuring out where development left off and maintains focus on planned priorities across multi-system integrations (Next.js, Vercel Blob, Supabase).

This document provides essential information for productive development. For detailed specifications, consult the architecture plan and implementation roadmap in the `claude/` directory.

## File Management Guidelines

- We should create txt files using the naming convention {github-issue-#}-short-description.txt in the claude/todos directory to track our work. We should update this file to reflect our progress as we go.

## Memories

### Development Principles
- Always use the new date lib when working with dates throughout the stack. Never use native date functions or directly use the Luxon lib outside of our config interface. If new date-related needs arise, edit or add to the config date lib

## Supabase Execution Memories

- Remember you need to use `npx supabase...` not `supabase...`

## Development Precautions

- We need to remember to be careful about keeping browser runtime code out of server code and vice versa in this repo
