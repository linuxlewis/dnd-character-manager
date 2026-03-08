# Testing Guide

This project uses **Vitest** for all tests. Tests are co-located with source files (`foo.ts` -> `foo.test.ts`).

## Commands

```bash
pnpm test          # Run all tests
pnpm lint          # Run Biome linter
pnpm lint && pnpm test  # Run both (do this before pushing)
```

## Testing by Layer

Each architectural layer has different testing concerns. Follow these conventions when adding or modifying tests.

### Types Layer (`types/`)

Tests validate Zod schemas and pure utility functions. No mocks, no async, no side effects.

**What to test:**
- Schema parsing: valid input passes, invalid input fails
- Edge cases on constraints (min/max values, empty strings, boundary integers)
- Pure functions derived from types (e.g., `getAbilityModifier`, `calculateAC`)

**Pattern:**
```ts
import { describe, expect, it } from "vitest";
import { MySchema, myUtilFunction } from "./my-type.js";

describe("MySchema", () => {
  it("parses valid input", () => {
    expect(MySchema.safeParse(validData).success).toBe(true);
  });
  it("rejects invalid input", () => {
    expect(MySchema.safeParse(badData).success).toBe(false);
  });
});
```

### Repo Layer (`repo/`)

Tests verify data access operations: create, read, update, delete, and round-trip persistence.

**What to test:**
- CRUD operations return correct data
- Generated fields (id, timestamps) are present and correct
- Update merges partial data without overwriting unchanged fields
- Missing-id lookups return `null` or `false`
- Data round-trips correctly (write then read back)

**Pattern:**
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { myRepo } from "./my-repo.js";

describe("myRepo", () => {
  beforeEach(async () => {
    await myRepo._clear();
  });

  it("create generates id and timestamps", async () => { ... });
  it("findById returns null for unknown id", async () => { ... });
});
```

### Service Layer (`service/`)

Tests verify business logic and orchestration. Service tests use the real repo (in-memory) and validate domain rules.

**What to test:**
- Happy path: service method produces expected result
- Validation: invalid input is rejected (throws)
- Missing entities: returns `null` for nonexistent ids
- Business rules: domain-specific logic (e.g., HP floors at 0, spell slots can't exceed available)
- State persistence: changes survive a read-back

**Pattern:**
```ts
import { afterEach, describe, expect, it } from "vitest";
import { myRepo } from "../repo/my-repo.js";
import { myService } from "./my-service.js";

describe("myService", () => {
  afterEach(async () => {
    await myRepo._clear();
  });

  it("creates with validation", async () => { ... });
  it("rejects invalid input", async () => {
    await expect(myService.create(badInput)).rejects.toThrow();
  });
  it("returns null for missing id", async () => { ... });
});
```

### Runtime Layer (`runtime/`)

Tests verify HTTP routes and API contracts using Fastify's `inject()` method. No real HTTP server is started.

**What to test:**
- Correct HTTP status codes (200, 201, 204, 400, 404)
- Response body shape matches expectations
- Error responses for invalid or missing data

**Pattern:**
```ts
import Fastify from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { myRepo } from "../repo/my-repo.js";
import { registerMyRoutes } from "./routes.js";

const app = Fastify();

beforeAll(async () => {
  await registerMyRoutes(app);
  await app.ready();
});

afterEach(async () => { await myRepo._clear(); });
afterAll(async () => { await app.close(); });

describe("My routes", () => {
  it("GET /api/things returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/api/things" });
    expect(res.statusCode).toBe(200);
  });
});
```

### UI Layer (`ui/`)

Tests verify component exports, pure display logic, CSS theme token usage, and API contract shapes. Currently uses logic-level tests rather than rendered component tests.

**What to test:**
- Component module exports the expected function
- Display calculations (percentages, formatting, color thresholds)
- API contract shapes (correct endpoint URLs, request body structure)
- CSS module uses theme tokens (no hardcoded colors)
- Responsive breakpoints exist

## General Rules

1. **Every new module gets a co-located test file.** If you create `foo.ts`, create `foo.test.ts` in the same directory.
2. **Clean up after tests.** Use `beforeEach`/`afterEach` with `repo._clear()` to reset state between tests.
3. **No `console.log` in tests.** Use `expect()` assertions only.
4. **Test names describe behavior.** Use the pattern: `it("returns null for missing id")` not `it("test 3")`.
5. **Run `pnpm lint && pnpm test` before pushing.** Both must pass cleanly.
