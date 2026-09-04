import { describe, expect, it } from "vitest";
import { assertE2eCatalogueCanBeConfigured } from "./test-policy.js";

describe("e2e catalogue setup policy", () => {
	it("allows a fresh owned stack to attach deterministic catalogue data", () => {
		expect(() => assertE2eCatalogueCanBeConfigured(true, false)).not.toThrow();
	});

	it("fails safely instead of reusing live catalogue sources", () => {
		expect(() => assertE2eCatalogueCanBeConfigured(true, true)).toThrow(
			"Run `pnpm stop` for this worktree, then rerun `pnpm test:e2e`",
		);
	});

	it("does not block integration-only reuse", () => {
		expect(() => assertE2eCatalogueCanBeConfigured(false, true)).not.toThrow();
	});
});
