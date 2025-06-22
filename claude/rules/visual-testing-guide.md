# 🧪 Visual Snapshot Testing Specification (v1.0)

## Purpose

This document defines the philosophy, structure, and execution model for frontend testing using visual snapshots as the **sole specification** of correctness. It is designed for automated agents and human developers to follow unambiguously.

---

## 1. Testing Philosophy

- The **visual appearance** of the application under defined interaction states is the only complete and non-abstract specification of behavior.
- Any internal state inspection, DOM queries, or accessibility trees are **not valid stand-ins** for UI correctness.
- Tests simulate real user behavior and **capture explicit visual snapshots** at key moments.
- If it **looks correct**, it **is** correct.

---

## 2. Testing Goals

- Exhaustively define and test all **happy-path user flows**.
- Capture visual snapshots at **every meaningful UI state**, including:
  - Entry points
  - Intermediate/loading/transitional states
  - Terminal states or confirmations
- Run all tests across a small, curated set of **viewports** to ensure responsive integrity.
- Store snapshots in git and require **manual approval** of updates via command.

---

## 3. Units of Testing

Each test consists of:

### Structure
- **Test Name**: `kebab-case` identifier.
- **Plain-English User Story**: A natural language description of the user journey.
- **Viewports**: Default set includes `mobile` and `desktop`, customizable per test.
- **Snapshot Points**: Human-defined visual checkpoints.

### Example Story
Test Name: new-user-signup

User Story:
A new visitor lands on the homepage, clicks "Sign Up", completes the form,
and lands on the welcome page.

We snapshot:

- Homepage
- Signup form
- Completed form
- Welcome page


## 4. Test Execution Framework

### Test Function Wrapper

```ts
runTestFlow('new-user-signup', async ({ page, snapshot }) => {
  await page.goto('/');
  await snapshot('homepage');

  await page.click('text=Sign Up');
  await snapshot('signup-form');

  await page.fill('#name', 'Alice');
  await page.fill('#email', 'alice@example.com');
  await snapshot('filled-form');

  await page.click('text=Submit');
  await snapshot('welcome-page');
});
```

### Snapshot Behavior
- snapshot(name) captures the visible state of the app.
- Ensures UI is stable before capture (waits for elements, animations, fonts).

`snapshots/<test-name>/<snapshot-name>-<viewport>.png`

### Failure Conditions
- Snapshot differs from git baseline beyond threshold.
- Snapshot call fails to stabilize.
- Required selectors are not present.

## 5. Snapshot Management

### Snapshot Storage
Snapshots are committed to version control.

Stored in:
`snapshots/<test-name>/<snapshot-name>-<viewport>.png`

### Updating Baselines
Baselines are updated only manually via:

```bash
npm run test:update
```

### Visual Review
- All diffs must be reviewed visually by a human.
- Automated diffs indicate a regression, not an approval.
- Git diffs alone are insufficient to approve updates.

### Metadata (Optional)
Each snapshot may have an optional .json file storing:

```json
{
  "updated_at": "2025-06-22T10:31:00Z",
  "viewport": "1280x720",
  "diff_pixels": 0
}
```

## 6. Agent Instructions
When coding a test:

- Read the English user story.
- Implement each interaction step using browser automation (e.g. Playwright).
- Explicitly call snapshot('step-name') at each described visual point.
- Ensure all required elements have loaded before capturing.
- Name snapshots clearly and consistently.
- Do not:
  - Auto-capture snapshots
  - Use DOM assertions or internal state validation
  - Reuse code unless it improves readability and clarity without abstraction

## 7. Assumptions
- Browser automation uses Playwright
- Tests run in parallel per viewport
- Snapshots are reviewed by humans before approval

## Appendix: Directory Layout
```
project-root/
├── tests/
│   └── new-user-signup.test.ts
├── snapshots/
│   └── new-user-signup/
│       ├── homepage-desktop.png
│       ├── signup-form-desktop.png
│       └── ...
├── utils/
│   └── snapshot.ts
├── README.md
└── playwright.config.ts
```