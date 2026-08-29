import { describe, expect, it } from "vitest";
import { CatalogueItemSeedAuditSchema, CatalogueItemSeedSchema } from "../types/index.js";
import {
	auditFor,
	seedItem,
	sourceKeys,
	testRevisions,
} from "./catalogue-item-repository.integration-fixtures.js";

describe("catalogue item repository integration fixtures", () => {
	it("produce valid isolated source records and audits", () => {
		expect(
			CatalogueItemSeedSchema.safeParse(
				seedItem({
					sourceKey: sourceKeys[0],
					rulesVersion: "2024",
					name: "Rope",
				}),
			).success,
		).toBe(true);
		expect(CatalogueItemSeedAuditSchema.safeParse(auditFor("2024", 1)).success).toBe(true);
		expect(testRevisions).toHaveLength(2);
	});
});
