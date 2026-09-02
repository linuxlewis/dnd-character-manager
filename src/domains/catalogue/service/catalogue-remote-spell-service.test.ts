import { describe, expect, it, vi } from "vitest";
import type { CatalogueRemoteSpellCapability } from "../types/index.js";
import { createCatalogueRemoteSpellService } from "./catalogue-remote-spell-service.js";

describe("createCatalogueRemoteSpellService", () => {
	it("implements the generic search/detail ports through an injected client", async () => {
		const client: CatalogueRemoteSpellCapability = {
			searchSpells: vi.fn(async () => [
				{
					index: "light",
					name: "Light",
					level: 0,
					url: "/api/2024/spells/light",
					source: "spell" as const,
				},
			]),
			findSpell: vi.fn(),
			getSpellDetails: vi.fn(async () => ({
				index: "light",
				name: "Light",
				level: 0,
				url: "/api/2024/spells/light",
				source: "spell" as const,
				desc: ["You touch one object."],
				higherLevel: [],
				metadata: [],
			})),
		};
		const service = createCatalogueRemoteSpellService({ client });

		await expect(service.search({ query: "light", slotLevel: 0 })).resolves.toHaveLength(1);
		await expect(service.detail("light")).resolves.toMatchObject({ index: "light" });
	});
});
