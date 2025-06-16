# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application called "transcript-analysis-system" that manages city council transcript uploads, storage, and analysis. The system uses Vercel Blob Storage for file storage and Supabase for metadata persistence.

## Common Commands

### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Testing
- `npm run test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:storage` - Run storage tests sequentially (required for blob storage tests)
- `npm run test:integration` - Run integration tests
- `npm run test:unit` - Run unit tests

### Docker (for integration testing)
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers  
- `npm run test:with-docker` - Run integration tests with Docker

## Architecture

### Storage Layer
The application uses a dual-storage approach:
- **Vercel Blob Storage**: For transcript file content
- **Supabase**: For transcript metadata and relationships

Key files:
- `src/lib/storage/blob.ts` - Main `TranscriptStorage` class implementing blob operations
- `src/lib/storage/createStorage.ts` - Factory for getting storage instances
- `src/lib/storage/client.ts` - Storage client configuration

### API Structure  
- `src/app/api/transcripts/route.ts` - Main transcript CRUD operations (GET, POST)
- `src/app/api/transcripts/[sourceId]/route.ts` - Individual transcript operations
- `src/app/api/error.ts` - Centralized error handling

### Frontend Components
- `src/components/transcript/TranscriptUpload.tsx` - File upload interface
- `src/components/ui/` - Reusable UI components using Radix UI and Tailwind

### Configuration
- `src/lib/config.ts` - Application configuration including blob storage settings, processing parameters, and deployment instructions
- Environment variables required: `BLOB_READ_WRITE_TOKEN`, `SUPABASE_URL`, `SUPABASE_KEY`

## Testing Patterns

### Storage Testing
- Storage tests must run sequentially: use `--max-concurrency=1 --sequence.concurrent=false`
- Test utilities in `src/__tests__/test-utils/TestTranscriptStorage.ts` provide in-memory storage for testing
- Mock setup in `src/__tests__/setup.ts` automatically mocks the storage layer

### Test Structure
- Unit tests: Individual function/class testing
- Integration tests: End-to-end API testing with Docker
- Coverage thresholds: 80% for branches, functions, lines, and statements

## Key Implementation Notes

### Transcript Processing
- Supports multiple formats: JSON, text, SRT, VTT
- Processing status tracking: pending, processed, failed
- Configurable segmentation for LLM processing (4000 token max segments with 200 token overlap)

### Metadata Schema
All transcripts require:
- `sourceId` (auto-generated if not provided)
- `title` 
- `date` (YYYY-MM-DD format)
- `speakers` (array, minimum 1)
- `format` (defaults to 'json')

### Security
- CORS configured in next.config.js
- Security headers implemented (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)
- Private blob access by default

### Testing Strategy
When testing APIs, excessive reliance on mocks for external services, databases, and dependencies can lead to brittle, tightly coupled tests that break whenever implementation details change. Instead, we should focus on testing behaviors, contracts, and properties to ensure robust, maintainable tests that remain valid even as implementations evolve.

This document outlines key principles and strategies to minimize tight coupling in API tests, along with concrete examples using Fast-Check (generative testing) and Pact (contract testing).

Core Testing Principles
	1.	Test Behaviors, Not Implementations
	•	Avoid verifying specific method calls or internal state changes.
	•	Focus on expected inputs and outputs or system-wide properties.
	2.	Use Generative Testing for Edge Cases
	•	Instead of static test cases, use property-based testing to generate a wide range of inputs and verify fundamental properties.
	3.	Use Contract Testing Instead of Mocks
	•	When interacting with external APIs, define contract tests to verify expected requests and responses instead of manually mocking services.
	4.	Prefer Realistic Test Environments Over Mocks
	•	Use in-memory databases (e.g., SQLite for Postgres) instead of faking database queries.
	•	Run local Docker instances for dependencies like Redis, Kafka, or third-party APIs.
	5.	Use Dependency Injection for Testability
	•	Inject dependencies rather than hardcoding them, allowing real or test-friendly implementations to be swapped in easily.

1. Generative Testing with Fast-Check

Instead of writing brittle, fixed test cases, Fast-Check generates many test cases dynamically to find edge cases.

Example: Property-Based Testing a String Reversal Function

import * as fc from "fast-check";

// Function to test
const reverse = (str: string) => str.split("").reverse().join("");

// Define properties
fc.assert(
  fc.property(fc.string(), (s) => {
    // The reverse of the reverse should be the original string
    return reverse(reverse(s)) === s;
  })
);

Why?

✅ Avoids tight coupling to specific test cases.
✅ Automatically tests edge cases (e.g., empty strings, Unicode).
✅ Finds bugs early by generating unexpected inputs.

2. Contract Testing with Pact

Instead of mocking APIs, Pact ensures that an API consumer (e.g., frontend) and provider (backend) agree on a contract, preventing integration failures.

Example: Verifying an External User API Contract

import { Pact } from "@pact-foundation/pact";

// Define the contract
const provider = new Pact({
  consumer: "FrontendApp",
  provider: "UserService",
});

describe("User API Contract Test", () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  test("User service should return user data", async () => {
    await provider.addInteraction({
      state: "User 123 exists",
      uponReceiving: "A request for user data",
      withRequest: {
        method: "GET",
        path: "/users/123",
      },
      willRespondWith: {
        status: 200,
        body: { id: 123, name: "Alice" },
      },
    });

    // Make the request
    const response = await fetch(provider.mockService.baseUrl + "/users/123");
    const body = await response.json();

    // Verify contract
    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 123, name: "Alice" });

    // Ensure contract consistency
    await provider.verify();
  });
});

Why?

✅ Prevents breaking API changes (e.g., if the provider modifies the response format).
✅ Avoids fragile mocks by ensuring real API compatibility.
✅ Works for microservices where different teams own different APIs.

3. Using an In-Memory Database Instead of Mocking Queries

Mocking database queries leads to false positives—your app might work in tests but fail in production. Instead, use an in-memory database like SQLite to run realistic tests.

Example: Testing Database Logic with SQLite (Prisma)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: "file:./test.db" } },
});

test("Creates a new user", async () => {
  const user = await prisma.user.create({
    data: { name: "Alice" },
  });

  expect(user.name).toBe("Alice");
});

Why?

✅ Avoids mocking individual queries.
✅ Catches real database constraint violations.
✅ Easier to maintain than manually created mocks.

4. Running External Dependencies with Docker Instead of Mocks

Mocking services like Redis, Kafka, or payment gateways leads to false confidence. Instead, run real dependencies locally using Docker.

Example: Running PostgreSQL & Redis for Testing

version: "3.8"
services:
  postgres:
    image: postgres
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: testdb
    ports:
      - "5432:5432"

  redis:
    image: redis
    ports:
      - "6379:6379"

Then, in tests:

import { createClient } from "redis";

test("Stores a value in Redis", async () => {
  const client = createClient();
  await client.connect();
  
  await client.set("key", "value");
  const result = await client.get("key");

  expect(result).toBe("value");
  await client.quit();
});

Why?

✅ Eliminates fake mocks by using real infrastructure.
✅ Tests actual integrations rather than assumptions.
✅ Works in CI/CD environments.

5. Using Dependency Injection to Avoid Hardcoded Dependencies

Instead of hardcoding services (forcing extensive mocking), use dependency injection so tests can swap real and test implementations.

Example: Swappable Email Service

interface EmailService {
  sendEmail(to: string, message: string): Promise<void>;
}

class RealEmailService implements EmailService {
  async sendEmail(to: string, message: string) {
    // Send a real email
  }
}

class FakeEmailService implements EmailService {
  async sendEmail(to: string, message: string) {
    console.log(`Fake email to ${to}: ${message}`);
  }
}

class UserService {
  constructor(private emailService: EmailService) {}

  async registerUser(email: string) {
    await this.emailService.sendEmail(email, "Welcome!");
  }
}

// Test with FakeEmailService
test("Sends email on registration", async () => {
  const emailService = new FakeEmailService();
  const userService = new UserService(emailService);

  await userService.registerUser("test@example.com");
});

Why?

✅ Eliminates deep mocks (no jest.mock(...)).
✅ Allows swapping real vs. test services easily.
✅ Improves modularity and testability.

Summary: Key Strategies to Reduce Mocking in API Tests

Problem	Solution
Mocking API responses	Use Pact (contract testing)
Mocking static test cases	Use Fast-Check (generative testing)
Mocking databases	Use in-memory databases (SQLite, DynamoDB Local)
Mocking external services	Use Dockerized local services (Postgres, Redis, Kafka)
Mocking dependencies	Use Dependency Injection

By minimizing mocks and focusing on real behaviors, you ensure more robust, maintainable tests.

## Claude Rules and Instructions

### Project-Specific Rule System
This repository includes a specialized instruction system in the `./claude/` directory that provides automated guidance for Claude Code instances.

**Rule Directory Structure:**
```
claude/
├── index.md                    # Directory overview and purpose
├── rule-management.md          # Instructions for creating/maintaining rules
└── rules/                      # Individual rule files
    ├── backlog-management.md   # Issue creation and management guidelines
    └── [other-rule-files].md   # Additional project-specific rules
```

### When to Use Claude Rules

**Automatic Application:**
Claude should proactively read and apply rules from `./claude/rules/` when:
- Starting work on new features or GitHub issues
- Creating or organizing backlog items  
- Making architectural or implementation decisions
- Following project-specific patterns and conventions
- User requests work that matches rule triggers

**Manual Reference:**
Explicitly check the rules directory when:
- User mentions creating issues or managing backlog
- User asks about project standards or conventions
- Encountering repeated patterns that could be automated
- User provides feedback that contradicts current approach

### How to Find and Use Rules

**Discovery Process:**
1. **Check for applicable rules** - Use `ls claude/rules/` to see available rules
2. **Read relevant rules** - Use `Read` tool to examine rule content  
3. **Apply rule guidance** - Follow step-by-step instructions in rules
4. **Validate application** - Use rule-specific validation criteria

**Rule Categories:**
- **Development practices** - Code style, architecture patterns, testing strategies
- **Issue management** - Backlog creation, task breakdown, dependency tracking
- **Documentation standards** - README updates, code comments, API docs
- **Deployment procedures** - Release processes, environment configuration

### Creating New Rules

**Automatic Rule Creation:**
Claude should create new rules in `./claude/rules/` when:
- Applying the same solution pattern multiple times
- User corrects or refines Claude's approach consistently  
- Complex decision trees emerge that could be automated
- New project phases require specialized guidance

**Rule Creation Process:**
1. **Identify trigger conditions** - When should this rule apply?
2. **Extract actionable steps** - What specific instructions enable automation?
3. **Include validation criteria** - How to verify correct application?
4. **Follow naming conventions** - Use kebab-case filenames (e.g., `api-testing-strategy.md`)
5. **Test immediately** - Apply the new rule to validate effectiveness

### Rule Maintenance

**Keep Rules Current:**
- Update rules when project architecture evolves
- Remove obsolete rules that no longer apply
- Ensure rules don't conflict with each other
- Version control all rule changes with descriptive commits

**Quality Standards:**
- Rules must be specific and actionable for automated application
- Include concrete examples and code snippets where helpful
- Write clear trigger conditions and validation steps
- Focus on automation rather than general development advice