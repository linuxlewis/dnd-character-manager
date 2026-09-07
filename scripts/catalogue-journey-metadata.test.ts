import { afterEach, describe, expect, it, vi } from "vitest";
import {
	CATALOGUE_JOURNEY_FIXTURE_ENV,
	readCatalogueJourneyFixture,
} from "./catalogue-journey-metadata.js";

afterEach(() => vi.unstubAllEnvs());

describe("worker catalogue metadata", () => {
	it("fails clearly when global setup did not publish metadata", () => {
		vi.stubEnv(CATALOGUE_JOURNEY_FIXTURE_ENV, "");
		expect(() => readCatalogueJourneyFixture()).toThrow("run through Playwright global setup");
	});

	it.each([
		"{",
		"null",
		"{}",
		JSON.stringify({ mode: "synthetic", rulesVersion: "2014" }),
	])("rejects malformed worker metadata %s", (value) => {
		vi.stubEnv(CATALOGUE_JOURNEY_FIXTURE_ENV, value);
		expect(() => readCatalogueJourneyFixture()).toThrow();
	});
});
