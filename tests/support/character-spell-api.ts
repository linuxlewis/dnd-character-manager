import type { Page } from "@playwright/test";
import type {
	CharacterSpell,
	CharacterSpellDetails,
	DndSpellDetails,
	DndSpellSearchResult,
} from "../../src/domains/characters/types/index.js";

export async function mockCharacterSpellApi(page: Page) {
	const savedSpells: CharacterSpell[] = [];
	const spellDetails: DndSpellDetails[] = [
		{
			index: "light",
			name: "Light",
			level: 0,
			url: "/api/2024/spells/light",
			source: "spell",
			desc: ["The object sheds bright light."],
			higherLevel: [],
			metadata: [],
		},
		{
			index: "lay-on-hands",
			name: "Lay on Hands",
			level: 1,
			url: "/api/2014/features/lay-on-hands",
			source: "feature",
			desc: ["Your blessed touch can heal wounds."],
			higherLevel: [],
			metadata: [{ label: "Feature Level", value: "1" }],
		},
		{
			index: "divine-smite",
			name: "Divine Smite",
			level: 1,
			url: "/api/2024/spells/divine-smite",
			source: "spell",
			desc: ["The attack deals extra radiant damage."],
			higherLevel: [],
			metadata: [],
		},
	];

	await page.route("**/api/characters/*/spells**", async (route) => {
		const request = route.request();
		const pathname = new URL(request.url()).pathname;
		const suffix = pathname.split("/spells")[1] ?? "";

		if (request.method() === "GET" && suffix === "") {
			await route.fulfill({ json: { spells: savedSpells } });
			return;
		}

		if (request.method() === "POST" && suffix === "/search") {
			const body = request.postDataJSON() as { query: string; slotLevel: number };
			const query = body.query.trim().toLowerCase();
			const results = spellDetails
				.filter((spell) => spell.name.toLowerCase().includes(query))
				.filter((spell) =>
					body.slotLevel === 0
						? spell.level === 0 || spell.source === "feature"
						: spell.source === "spell" && spell.level > 0 && spell.level <= body.slotLevel,
				)
				.map(toSearchResult);
			await route.fulfill({ json: { spells: results } });
			return;
		}

		if (request.method() === "POST" && suffix === "") {
			const body = request.postDataJSON() as {
				slotLevel: number;
				spellIndex: string;
				source: "feature" | "spell";
			};
			const details = spellDetails.find(
				(spell) => spell.index === body.spellIndex && spell.source === body.source,
			);
			if (!details) {
				await route.fulfill({ status: 404, json: { error: "Spell not found." } });
				return;
			}
			const existing = savedSpells.find(
				(spell) =>
					spell.slotLevel === body.slotLevel &&
					spell.spellIndex === body.spellIndex &&
					spell.source === body.source,
			);
			if (!existing) {
				savedSpells.push({
					id: `00000000-0000-4000-8000-${String(savedSpells.length + 1).padStart(12, "0")}`,
					slotLevel: body.slotLevel,
					spellIndex: details.index,
					name: details.name,
					level: details.level,
					url: details.url,
					source: details.source,
				});
			}
			await route.fulfill({ json: { spells: savedSpells } });
			return;
		}

		if (request.method() === "GET" && suffix.startsWith("/")) {
			const saved = savedSpells.find((spell) => spell.id === suffix.slice(1));
			const details = spellDetails.find(
				(spell) => spell.index === saved?.spellIndex && spell.source === saved?.source,
			);
			if (!saved || !details) {
				await route.fulfill({ status: 404, json: { error: "Spell not found." } });
				return;
			}
			const response: CharacterSpellDetails = { ...saved, ...details };
			await route.fulfill({ json: { spell: response } });
			return;
		}

		if (request.method() === "DELETE" && suffix.startsWith("/")) {
			const index = savedSpells.findIndex((spell) => spell.id === suffix.slice(1));
			if (index >= 0) savedSpells.splice(index, 1);
			await route.fulfill({ json: { spells: savedSpells } });
			return;
		}

		await route.continue();
	});
}

function toSearchResult(spell: DndSpellDetails): DndSpellSearchResult {
	return {
		index: spell.index,
		name: spell.name,
		level: spell.level,
		url: spell.url,
		source: spell.source,
	};
}
