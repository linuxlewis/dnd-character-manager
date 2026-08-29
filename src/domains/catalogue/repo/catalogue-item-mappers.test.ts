import { describe, expect, it } from "vitest";
import { itemColumns } from "./catalogue-item-mappers.js";

describe("catalogue item mappers", () => {
	it("selects every normalized and provenance column", () => {
		expect(Object.keys(itemColumns())).toEqual([
			"id",
			"source",
			"sourceKey",
			"sourcePath",
			"sourceRevision",
			"sourceUrl",
			"rulesVersion",
			"license",
			"seedCapability",
			"seedPack",
			"seedMetadata",
			"itemIdentifier",
			"itemName",
			"itemKind",
			"itemCategory",
			"itemDescription",
			"isMagical",
			"itemRarity",
			"requiresAttunement",
			"costValue",
			"costDenomination",
			"weight",
			"thumbnailUrl",
			"properties",
			"stats",
			"sourcePayload",
		]);
	});
});
