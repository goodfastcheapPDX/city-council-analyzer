# 🧪 Property-Based Testing: Agent-Focused Summary

This is a distilled guide for coding agents implementing property-based tests using `fast-check` in TypeScript. It outlines key patterns, concepts, and responsibilities for specifying software behavior via universal properties, not example-based inputs.

---

## 🔍 What is Property-Based Testing?

- **Input Generation**: Automatically generate structured, varied inputs using generators.
- **Property Assertions**: Define invariant or postcondition truths that must hold for all inputs.
- **Counterexample Shrinking**: Automatically minimize failing inputs to their simplest failing form.

---

## ✅ Agent Responsibilities

When asked to implement a property-based test, an agent should:

1. **Use `fast-check` generators** to construct valid, realistic domain inputs.
2. **Write properties** that assert truths about the behavior or output of a function.
3. **Avoid trivial assertions** or restating the implementation logic.
4. **Ensure shrinking is supported** by using standard or custom generator composition.
5. **Run with proper configuration** (e.g., `numRuns`, `timeout`) depending on criticality.

---

## 📦 Generator Patterns

```ts
// Use fc.record, fc.string, fc.date, fc.constantFrom, etc.
const transcript = fc.record({
  title: fc.string({ minLength: 1 }),
  date: fc.date().map(d => d.toISOString().split('T')[0]),
  speakers: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
  content: fc.string({ minLength: 10 }),
});
```

Compose from small pieces

Use .map(), .filter(), .chain() for domain constraints

Create realistic edge cases (e.g. long names, empty strings, repeated items)

## 🧠 Property Templates
Invariant Property

```ts
fc.assert(fc.property(transcript, (data) => {
  const parsed = parseTranscript(JSON.stringify(data));
  expect(parsed.title).toBe(data.title);
}));
```

Postcondition Property
```ts
fc.assert(fc.property(fc.string(), async (text) => {
  const result = await tokenCounter.count(text);
  expect(result.count).toBeGreaterThanOrEqual(0);
  expect(Number.isInteger(result.count)).toBe(true);
}));
```

Metamorphic Property
```ts
fc.assert(fc.property(fc.string(), fc.string(), (a, b) => {
  const sum = tokenCount(a + ' ' + b);
  const expected = tokenCount(a) + tokenCount(b);
  expect(Math.abs(sum - expected)).toBeLessThan(5);
}));
```

Model-Based Property
```ts
fc.assert(fc.property(fc.string(), (text) => {
  const advanced = tokenizeAdvanced(text);
  const simple = text.trim().split(/\s+/);
  expect(Math.abs(advanced.length - simple.length)).toBeLessThan(3);
}));
```

### 🛠 Useful Config Options
```ts
fc.assert(property, {
  numRuns: 100,       // More for critical systems
  timeout: 3000,      // Per test
  seed: 42,           // For reproducibility
  endOnFailure: true  // Faster failure cycles
});
```

## 🧱 Integration Pattern
```ts
describe('TokenCounter Properties', () => {
  it('should count non-negative integers', () => {
    fc.assert(fc.property(fc.string(), (text) => {
      const count = tokenCounter.count(text);
      expect(count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(count)).toBe(true);
    }));
  });
});
```

## ⚠️ Common Pitfalls
| Mistake                            | Fix                                       |
| ---------------------------------- | ----------------------------------------- |
| Trivial properties (`x + 0 === x`) | Write domain-relevant invariants          |
| Overconstrained generators         | Start broad, constrain only for realism   |
| Unshrunk failures                  | Use native `fc` combinators for shrinking |
| Properties restate implementation  | Focus on behavior, not internals          |


## 📌 Property Categories Cheat Sheet
- Invariant: Something is always true
- Postcondition: The output meets a guarantee
- Metamorphic: Output relationships hold across inputs
- Model-Based: Matches a simpler trusted implementation

## 🧠 Design Philosophy
"Properties capture intention. Examples capture accidents."
– Hillel Wayne

IMPORTANT: Use properties to define what should always be true. Let the generators explore what you didn’t think of.