import { describe, expect, it, vi } from "vitest";
import type { CharacterItemCatalogueClient } from "./catalogue-item-client.js";
import {
	withCatalogueSnapshot,
	withOptionalCatalogueSnapshot,
} from "./character-item-catalogue.js";

describe("character item catalogue snapshots", () => {
	it("leaves manual updates unchanged when no reference is supplied", async () => {
		const client = { getItemDetails: vi.fn() } as unknown as CharacterItemCatalogueClient;
		const request = { notes: "manual", properties: {} } as const;

		await expect(withOptionalCatalogueSnapshot(request, client)).resolves.toEqual(request);
		expect(client.getItemDetails).not.toHaveBeenCalled();
	});

	it("clears all traceability fields when a reference is explicitly removed", async () => {
		const client = { getItemDetails: vi.fn() } as unknown as CharacterItemCatalogueClient;

		await expect(withOptionalCatalogueSnapshot({ catalogueItemId: null }, client)).resolves.toEqual(
			{
				catalogueItemId: null,
				catalogueSourceKey: null,
				catalogueRulesVersion: null,
			},
		);
		expect(client.getItemDetails).not.toHaveBeenCalled();
	});

	it("does not resolve a null create reference", async () => {
		const client = { getItemDetails: vi.fn() } as unknown as CharacterItemCatalogueClient;

		await expect(
			withCatalogueSnapshot(
				{
					name: "Rope",
					type: "misc",
					category: "Gear",
					quantity: 1,
					properties: {},
					catalogueItemId: null,
				},
				client,
			),
		).resolves.toMatchObject({ name: "Rope" });
	});
});
