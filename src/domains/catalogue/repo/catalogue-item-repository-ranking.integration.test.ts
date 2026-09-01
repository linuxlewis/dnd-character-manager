import { closeDb, getDb } from "@providers/database/index.js";
import { afterAll, describe, expect, it } from "vitest";
import {
	auditFor,
	seedItem,
	sourceKeys,
} from "./catalogue-item-repository.integration-fixtures.js";
import { createCatalogueItemRepository } from "./catalogue-item-repository.js";

const testRollback = Symbol("catalogue item repository ranking test rollback");

afterAll(async () => closeDb());

describe.sequential("catalogue item repository search ranking", () => {
	it("ranks name matches ahead of description-only matches with deterministic ties", async () => {
		await getDb()
			.transaction(async (tx) => {
				const repository = createCatalogueItemRepository(tx);
				const items = [
					seedItem({
						sourceKey: sourceKeys[2],
						rulesVersion: "2024",
						name: "Healing",
						description: "Exact name match.",
					}),
					seedItem({
						sourceKey: sourceKeys[3],
						rulesVersion: "2024",
						name: "Potion of Healing",
						description: "Whole-word name match.",
					}),
					seedItem({
						sourceKey: sourceKeys[4],
						rulesVersion: "2024",
						name: "Healing Potion",
						description: "Starts-with name match.",
					}),
					seedItem({
						sourceKey: sourceKeys[10],
						rulesVersion: "2024",
						name: "Potion of Greater Healing",
						description: "Longer whole-word name match.",
					}),
					seedItem({
						sourceKey: sourceKeys[11],
						rulesVersion: "2024",
						name: "Superior Potion of Healing",
						description: "Another longer whole-word name match.",
					}),
					seedItem({
						sourceKey: sourceKeys[12],
						rulesVersion: "2024",
						name: "Staff of Healing",
						description: "Actual-style whole-word name match.",
					}),
					seedItem({
						sourceKey: sourceKeys[5],
						rulesVersion: "2024",
						name: "Woundhealing Tonic",
						description: "General name substring match.",
					}),
					seedItem({
						sourceKey: sourceKeys[6],
						rulesVersion: "2024",
						name: "Amber Remedy",
						description: "A healing aid with no name match.",
					}),
					seedItem({
						sourceKey: sourceKeys[7],
						rulesVersion: "2024",
						name: "Field Dressing",
						description: "A healing aid with a tied item name.",
					}),
					seedItem({
						sourceKey: sourceKeys[8],
						rulesVersion: "2024",
						name: "Field Dressing",
						description: "Another healing aid with a tied item name.",
					}),
					seedItem({
						sourceKey: sourceKeys[9],
						rulesVersion: "2024",
						name: "Zulu Remedy",
						description: "A healing aid with no name match.",
					}),
				];

				await repository.upsertItems(items, auditFor("2024", items.length));

				const results = await repository.searchItems({ q: "healing", limit: 50 });
				expect(results.total).toBe(items.length);
				expect(results.items.map((item) => item.sourceKey)).toEqual([
					sourceKeys[2],
					sourceKeys[4],
					sourceKeys[3],
					sourceKeys[12],
					sourceKeys[10],
					sourceKeys[11],
					sourceKeys[5],
					sourceKeys[6],
					sourceKeys[8],
					sourceKeys[7],
					sourceKeys[9],
				]);
				expect(
					results.items
						.map((item) => item.name)
						.filter((name) =>
							[
								"Potion of Healing",
								"Staff of Healing",
								"Potion of Greater Healing",
								"Superior Potion of Healing",
							].includes(name),
						),
				).toEqual([
					"Potion of Healing",
					"Staff of Healing",
					"Potion of Greater Healing",
					"Superior Potion of Healing",
				]);

				const limited = await repository.searchItems({ q: "healing", limit: 3 });
				expect(limited.total).toBe(items.length);
				expect(limited.items.map((item) => item.name)).toEqual([
					"Healing",
					"Healing Potion",
					"Potion of Healing",
				]);

				expect(await repository.searchItems({ q: "healing' OR 1=1 --", limit: 50 })).toEqual({
					items: [],
					total: 0,
				});
				throw testRollback;
			})
			.catch((error: unknown) => {
				if (error !== testRollback) throw error;
			});
	});
});
