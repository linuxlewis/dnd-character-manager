import { describe, expect, it, vi } from "vitest";
import { getLegacySpellDetails } from "./dnd-api-legacy-spell-client.js";

describe("getLegacySpellDetails", () => {
	it("loads 2014 spell details for saved spells that are unavailable in SRD 2024", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				index: "branding-smite",
				name: "Branding Smite",
				level: 2,
				url: "/api/2014/spells/branding-smite",
				desc: ["The weapon gleams with astral radiance as you strike."],
				higher_level: ["The extra damage increases by 1d6."],
				casting_time: "1 bonus action",
				range: "Self",
				duration: "Up to 1 minute",
				components: ["V"],
				school: { name: "Evocation" },
				classes: [{ name: "Paladin" }],
			}),
		);

		await expect(
			getLegacySpellDetails("https://www.dnd5eapi.co", fetcher, "branding-smite", "spell"),
		).resolves.toEqual({
			index: "branding-smite",
			name: "Branding Smite",
			level: 2,
			url: "/api/2014/spells/branding-smite",
			source: "spell",
			desc: ["The weapon gleams with astral radiance as you strike."],
			higherLevel: ["The extra damage increases by 1d6."],
			metadata: [
				{ label: "Casting Time", value: "1 bonus action" },
				{ label: "Range", value: "Self" },
				{ label: "Duration", value: "Up to 1 minute" },
				{ label: "Components", value: "V" },
				{ label: "School", value: "Evocation" },
				{ label: "Classes", value: "Paladin" },
			],
		});
	});

	it("loads 2014 feature details for already saved feature entries", async () => {
		const fetcher = vi.fn().mockResolvedValue(
			jsonResponse({
				index: "divine-smite",
				name: "Divine Smite",
				level: 2,
				url: "/api/2014/features/divine-smite",
				desc: ["You can expend one spell slot to deal radiant damage."],
				class: { name: "Paladin" },
			}),
		);

		await expect(
			getLegacySpellDetails("https://www.dnd5eapi.co", fetcher, "divine-smite", "feature"),
		).resolves.toEqual({
			index: "divine-smite",
			name: "Divine Smite",
			level: 2,
			url: "/api/2014/features/divine-smite",
			source: "feature",
			desc: ["You can expend one spell slot to deal radiant damage."],
			higherLevel: [],
			metadata: [
				{ label: "Feature Level", value: "2" },
				{ label: "Class", value: "Paladin" },
			],
		});
	});
});

function jsonResponse(body: unknown) {
	return {
		ok: true,
		json: async () => body,
	} as Response;
}
