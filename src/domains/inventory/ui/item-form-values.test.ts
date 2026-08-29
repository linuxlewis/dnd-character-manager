import { describe, expect, it } from "vitest";
import type { CatalogueItemDetails } from "../../catalogue/types/index.js";
import {
	catalogueItemToFormValues,
	toCharacterItemRequest,
	validateItemForm,
} from "./item-form-values.js";

const catalogueItem: CatalogueItemDetails = {
	id: "00000000-0000-4000-8000-000000000021",
	source: "foundry-dnd5e",
	sourceKey: "phbwepSilveredSword",
	sourcePath: "packs/_source/equipment24/weapons/silvered-sword.yml",
	rulesVersion: "2024",
	license: "CC-BY-4.0",
	sourcePayload: {},
	sourceRevision: "0123456789abcdef0123456789abcdef01234567",
	sourceUrl:
		"https://raw.githubusercontent.com/foundryvtt/dnd5e/0123456789abcdef0123456789abcdef01234567/packs/_source/equipment24/weapons/silvered-sword.yml",
	capability: "equipment",
	pack: "equipment24",
	seedMetadata: {},
	identifier: "silvered-sword",
	name: "Silvered Sword",
	kind: "weapon",
	category: "Weapons",
	description: "A sword treated with silver.",
	isMagical: false,
	rarity: null,
	requiresAttunement: false,
	costValue: 15,
	costDenomination: "sp",
	weight: 3,
	thumbnailUrl: null,
	properties: ["versatile"],
	stats: { damage: "1d8 slashing" },
};

describe("item form values", () => {
	it("auto-fills owned fields and preserves catalogue stats", () => {
		expect(catalogueItemToFormValues(catalogueItem)).toMatchObject({
			name: "Silvered Sword",
			type: "equipment",
			category: "Weapons",
			estimatedValue: 1.5,
			properties: {
				catalogueKind: "weapon",
				isMagical: false,
				stats: { damage: "1d8 slashing" },
			},
		});
	});

	it("reports required and numeric validation errors", () => {
		const values = catalogueItemToFormValues(catalogueItem);
		expect(
			validateItemForm({ ...values, name: "", category: "", quantity: 0, weight: -1 }),
		).toMatchObject({
			name: "Name is required.",
			category: "Category is required.",
			quantity: "Enter a whole number greater than zero.",
			weight: "Enter zero or a positive number.",
		});
	});

	it("normalizes a valid create request without losing the catalogue reference", () => {
		const values = catalogueItemToFormValues(catalogueItem);
		const request = toCharacterItemRequest(
			{ ...values, name: "  Silvered Sword ", quantity: "2", notes: "Travel weapon" },
			"create",
			catalogueItem.id,
		);
		expect(request).toMatchObject({
			name: "Silvered Sword",
			quantity: 2,
			notes: "Travel weapon",
			catalogueItemId: catalogueItem.id,
		});
	});
});
