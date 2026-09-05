import { describe, expect, it } from "vitest";
import {
	DND_API_2014_REST_BASE_URL,
	getCatalogueRemoteSourceConfig,
	OPEN5E_API_BASE_URL,
} from "./index.js";

describe("catalogue remote source configuration", () => {
	it("uses the production source defaults when no override is configured", () => {
		expect(getCatalogueRemoteSourceConfig({})).toEqual({
			open5eBaseUrl: OPEN5E_API_BASE_URL,
			legacyBaseUrl: DND_API_2014_REST_BASE_URL,
		});
	});

	it("accepts validated local source endpoints for deterministic tests", () => {
		expect(
			getCatalogueRemoteSourceConfig({
				CATALOGUE_OPEN5E_BASE_URL: "http://127.0.0.1:4311/open5e/v2",
				CATALOGUE_LEGACY_BASE_URL: "http://127.0.0.1:4311/legacy",
			}),
		).toEqual({
			open5eBaseUrl: "http://127.0.0.1:4311/open5e/v2",
			legacyBaseUrl: "http://127.0.0.1:4311/legacy",
		});
	});

	it("rejects malformed source endpoint overrides", () => {
		expect(() =>
			getCatalogueRemoteSourceConfig({
				CATALOGUE_OPEN5E_BASE_URL: "not-a-url",
			}),
		).toThrow();
	});
});
