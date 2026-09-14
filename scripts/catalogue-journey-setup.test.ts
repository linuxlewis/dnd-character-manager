import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CATALOGUE_JOURNEY_FIXTURE_ENV,
	readCatalogueJourneyFixture,
} from "./catalogue-journey-metadata.js";
import setupCatalogueJourney from "./catalogue-journey-setup.js";

const state = vi.hoisted(() => ({
	order: [] as string[],
	end: vi.fn(),
	connect: vi.fn(),
	prepare: vi.fn(),
	cleanup: vi.fn(),
}));
vi.mock("postgres", () => ({ default: state.connect }));
vi.mock("../tests/e2e/catalogue-journey-fixture.js", () => ({
	prepareCatalogueJourneyFixture: state.prepare,
	cleanupCatalogueJourneyFixture: state.cleanup,
}));
const fixture = {
	mode: "synthetic",
	searchQuery: "suite search",
	inventorySearchQuery: "blade",
	mundaneName: "Silvered Blade",
	magicName: "Moonblade",
	rulesVersion: "2024",
};

beforeEach(() => {
	vi.resetAllMocks();
	state.order.length = 0;
	vi.stubEnv("DATABASE_URL", "postgres://fixture.invalid/test");
	vi.stubEnv(CATALOGUE_JOURNEY_FIXTURE_ENV, "");
	state.connect.mockReturnValue({ end: state.end });
	state.prepare.mockImplementation(async () => {
		state.order.push("prepare");
		return fixture;
	});
	state.cleanup.mockImplementation(async () => {
		state.order.push("cleanup");
	});
	state.end.mockImplementation(async () => {
		state.order.push("end");
	});
});
afterEach(() => vi.unstubAllEnvs());

describe("suite-owned catalogue lifecycle", () => {
	it("prepares once, publishes validated metadata for workers, and holds resources until teardown", async () => {
		const teardown = await setupCatalogueJourney();
		expect(readCatalogueJourneyFixture()).toEqual(fixture);
		expect(readCatalogueJourneyFixture()).toEqual(fixture);
		expect(state.connect).toHaveBeenCalledExactlyOnceWith("postgres://fixture.invalid/test", {
			max: 1,
		});
		expect(state.order).toEqual(["prepare"]);
		await teardown();
		await teardown();
		expect(state.order).toEqual(["prepare", "cleanup", "end"]);
		expect(state.cleanup).toHaveBeenCalledWith(state.connect.mock.results[0].value);
		expect(process.env[CATALOGUE_JOURNEY_FIXTURE_ENV]).toBeUndefined();
	});

	it("cleans partial preparation before closing its connection and rethrows the original error", async () => {
		const failure = new Error("setup failed after acquiring ownership");
		state.prepare.mockRejectedValue(failure);
		await expect(setupCatalogueJourney()).rejects.toBe(failure);
		expect(state.order).toEqual(["cleanup", "end"]);
		expect(process.env[CATALOGUE_JOURNEY_FIXTURE_ENV]).toBeUndefined();
	});

	it("closes the connection even when teardown cannot restore the audit", async () => {
		const teardown = await setupCatalogueJourney();
		const failure = new Error("audit restore failed");
		state.cleanup.mockRejectedValue(failure);
		await expect(teardown()).rejects.toBe(failure);
		expect(state.end).toHaveBeenCalledOnce();
		expect(process.env[CATALOGUE_JOURNEY_FIXTURE_ENV]).toBeUndefined();
	});

	it("retains both setup and cleanup failures while still closing the connection", async () => {
		const setupError = new Error("setup failed");
		const cleanupError = new Error("cleanup failed");
		state.prepare.mockRejectedValue(setupError);
		state.cleanup.mockRejectedValue(cleanupError);
		await expect(setupCatalogueJourney()).rejects.toMatchObject({
			errors: [setupError, cleanupError],
		});
		expect(state.end).toHaveBeenCalledOnce();
	});

	it("rejects invalid prepared metadata and cleans owned resources rather than publishing it", async () => {
		state.prepare.mockResolvedValue({ ...fixture, rulesVersion: "invalid" });
		await expect(setupCatalogueJourney()).rejects.toThrow();
		expect(state.order).toEqual(["cleanup", "end"]);
		expect(process.env[CATALOGUE_JOURNEY_FIXTURE_ENV]).toBeUndefined();
	});

	it("requires an owned database URL before opening resources", async () => {
		vi.stubEnv("DATABASE_URL", "");
		await expect(setupCatalogueJourney()).rejects.toThrow("DATABASE_URL is required");
		expect(state.connect).not.toHaveBeenCalled();
	});
});
