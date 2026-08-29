import { describe, expect, it } from "vitest";
import {
	FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX,
	FOUNDRY_DND5E_GITHUB_REF,
	FOUNDRY_DND5E_SOURCE_URL,
	FOUNDRY_DND5E_SPELLS_PATH_PREFIX,
	foundryDnd5eRawUrl,
	foundryDnd5eTreeUrl,
} from "./index.js";
import { CATALOGUE_SOURCE_MANIFEST } from "./manifest.js";

describe("catalogue source manifest", () => {
	it("pins the Foundry source to an immutable revision and both C1 packs", () => {
		expect(FOUNDRY_DND5E_GITHUB_REF).toMatch(/^[0-9a-f]{40}$/);
		expect(CATALOGUE_SOURCE_MANIFEST).toMatchObject({
			source: "foundry-dnd5e",
			sourceUrl: FOUNDRY_DND5E_SOURCE_URL,
			sourceRevision: FOUNDRY_DND5E_GITHUB_REF,
			attribution: "Foundry Virtual Tabletop dnd5e system repository",
			repositoryLicense: "MIT",
			rulesVersion: "2024",
			packs: [
				{ pack: "spells24", capability: "spells", pathPrefix: FOUNDRY_DND5E_SPELLS_PATH_PREFIX },
				{
					pack: "equipment24",
					capability: "equipment",
					pathPrefix: FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX,
				},
			],
		});
		expect(foundryDnd5eTreeUrl()).toBe(
			`https://api.github.com/repos/foundryvtt/dnd5e/git/trees/${FOUNDRY_DND5E_GITHUB_REF}?recursive=1`,
		);
		expect(foundryDnd5eTreeUrl("release-5.2.1")).toBe(
			"https://api.github.com/repos/foundryvtt/dnd5e/git/trees/release-5.2.1?recursive=1",
		);
		expect(foundryDnd5eRawUrl(`${FOUNDRY_DND5E_SPELLS_PATH_PREFIX}light.yml`)).toBe(
			`https://raw.githubusercontent.com/foundryvtt/dnd5e/${FOUNDRY_DND5E_GITHUB_REF}/packs/_source/spells24/light.yml`,
		);
		expect(foundryDnd5eRawUrl("packs/_source/equipment24/rope.yml", "release-5.2.1")).toBe(
			"https://raw.githubusercontent.com/foundryvtt/dnd5e/release-5.2.1/packs/_source/equipment24/rope.yml",
		);
	});
});
