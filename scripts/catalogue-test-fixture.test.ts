import { afterEach, describe, expect, it } from "vitest";
import { type CatalogueTestFixture, startCatalogueTestFixture } from "./catalogue-test-fixture.js";

let fixture: CatalogueTestFixture | undefined;

afterEach(async () => {
	await fixture?.close();
	fixture = undefined;
});

describe("catalogue test fixture", () => {
	it("serves the health-flow spell and feature records through the remote source shape", async () => {
		fixture = await startCatalogueTestFixture();

		const spellSearch = await fetch(
			`${fixture.open5eBaseUrl}/spells/?name__icontains=divine%20smite&document__key__in=srd-2024&level__lte=3`,
		);
		const spellDetails = await fetch(`${fixture.open5eBaseUrl}/spells/srd-2024_divine-smite/`);
		const featureSearch = await fetch(
			`${fixture.legacyBaseUrl}/api/2014/features?name=lay%20on%20hands`,
		);
		const featureDetails = await fetch(`${fixture.legacyBaseUrl}/api/2014/features/lay-on-hands`);

		expect(spellSearch.status).toBe(200);
		expect(await spellSearch.json()).toMatchObject({
			results: [{ key: "srd-2024_divine-smite", name: "Divine Smite", level: 1 }],
		});
		expect(await spellDetails.json()).toMatchObject({
			key: "srd-2024_divine-smite",
			name: "Divine Smite",
		});
		expect(await featureSearch.json()).toEqual({
			results: [{ index: "lay-on-hands", name: "Lay on Hands" }],
		});
		expect(await featureDetails.json()).toMatchObject({
			index: "lay-on-hands",
			name: "Lay on Hands",
		});
	});
});
