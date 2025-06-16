# Testing Strategy and Guidelines

## Purpose
This rule provides comprehensive testing guidance for the city council transcript analysis system, emphasizing property-based testing and realistic test environments over mocking.

## When to Apply
Apply this rule when:
- Writing tests for new components or APIs
- Reviewing existing test suites for quality improvements
- Setting up testing infrastructure
- User requests testing guidance or test improvements

## Core Testing Principles

### 1. Test Behaviors, Not Implementations
- Avoid verifying specific method calls or internal state changes
- Focus on expected inputs and outputs or system-wide properties
- Test the "what" not the "how"

### 2. Use Generative Testing for Edge Cases
- Instead of static test cases, use property-based testing to generate a wide range of inputs
- Verify fundamental properties that should always hold true
- Let the testing framework find edge cases you didn't think of

### 3. Use Contract Testing Instead of Mocks
- When interacting with external APIs, define contract tests to verify expected requests and responses
- Avoid manually mocking services that can change
- Ensure real API compatibility rather than testing your mocks

### 4. Prefer Realistic Test Environments Over Mocks
- Use in-memory databases (e.g., SQLite for Postgres) instead of faking database queries
- Run local Docker instances for dependencies like Redis, databases, or third-party APIs
- Test with real infrastructure when possible

### 5. Use Dependency Injection for Testability
- Inject dependencies rather than hardcoding them
- Allow real or test-friendly implementations to be swapped in easily
- Reduce the need for complex mocking

## Implementation Examples

### Generative Testing with Fast-Check

```typescript
import * as fc from "fast-check";

// Instead of writing brittle, fixed test cases, Fast-Check generates many test cases dynamically
const reverse = (str: string) => str.split("").reverse().join("");

// Define properties that should always be true
fc.assert(
  fc.property(fc.string(), (s) => {
    // The reverse of the reverse should be the original string
    return reverse(reverse(s)) === s;
  })
);
```

**Benefits:**
- Avoids tight coupling to specific test cases
- Automatically tests edge cases (empty strings, Unicode, etc.)
- Finds bugs early by generating unexpected inputs

### Contract Testing with Pact

```typescript
import { Pact } from "@pact-foundation/pact";

// Define the contract between consumer and provider
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

    const response = await fetch(provider.mockService.baseUrl + "/users/123");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ id: 123, name: "Alice" });

    await provider.verify();
  });
});
```

**Benefits:**
- Prevents breaking API changes
- Avoids fragile mocks by ensuring real API compatibility
- Works for microservices where different teams own different APIs

### In-Memory Database Testing

```typescript
import { PrismaClient } from "@prisma/client";

// Use SQLite in-memory database instead of mocking queries
const prisma = new PrismaClient({
  datasources: { db: { url: "file:./test.db" } },
});

test("Creates a new user", async () => {
  const user = await prisma.user.create({
    data: { name: "Alice" },
  });

  expect(user.name).toBe("Alice");
});
```

**Benefits:**
- Avoids mocking individual queries
- Catches real database constraint violations
- Easier to maintain than manually created mocks

### Docker for External Dependencies

```yaml
# docker-compose.test.yml
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
```

```typescript
import { createClient } from "redis";

test("Stores a value in Redis", async () => {
  const client = createClient();
  await client.connect();
  
  await client.set("key", "value");
  const result = await client.get("key");

  expect(result).toBe("value");
  await client.quit();
});
```

**Benefits:**
- Eliminates fake mocks by using real infrastructure
- Tests actual integrations rather than assumptions
- Works in CI/CD environments

### Dependency Injection for Testing

```typescript
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
```

**Benefits:**
- Eliminates deep mocks (no jest.mock(...))
- Allows swapping real vs. test services easily
- Improves modularity and testability

## Project-Specific Testing Guidelines

### Storage Testing Requirements
- Storage tests must run sequentially: use `--max-concurrency=1 --sequence.concurrent=false`
- Use `TestTranscriptStorage` utility from `src/__tests__/test-utils/` for in-memory testing
- Test with realistic transcript data from multiple sources

### API Testing Requirements
- Use property-based testing for input validation
- Test with real database (SQLite in-memory)
- Use contract testing for external API integrations
- Test error scenarios with realistic error conditions

### Performance Testing Requirements
- Include performance assertions in tests (<100ms for API responses)
- Test with large datasets (1000+ transcript segments)
- Memory usage validation for batch operations
- Concurrent operation testing

## Anti-Patterns to Avoid

| Problem | Solution |
|---------|----------|
| Mocking API responses | Use Pact (contract testing) |
| Mocking static test cases | Use Fast-Check (generative testing) |
| Mocking databases | Use in-memory databases (SQLite, DynamoDB Local) |
| Mocking external services | Use Dockerized local services (Postgres, Redis, Kafka) |
| Mocking dependencies | Use Dependency Injection |

## Validation Criteria

When applying this testing strategy:
- [ ] Tests focus on behavior rather than implementation details
- [ ] Property-based testing is used for input validation and edge cases
- [ ] External dependencies use realistic test environments
- [ ] Contract tests verify API compatibility
- [ ] Test coverage meets project requirements (80% minimum)
- [ ] Tests run reliably in CI/CD environments