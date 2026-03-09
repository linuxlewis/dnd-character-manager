import { type Page, test as base, expect } from "@playwright/test";

interface TestCharacter {
	name: string;
	race: string;
	class: string;
	level: number;
	abilityScores: Record<string, number>;
	hp?: { current: number; max: number; temp: number };
	conditions?: Array<{ name: string; durationRounds: number | null }>;
	concentration?: boolean;
}

const DEFAULT_CHARACTER: TestCharacter = {
	name: "Thorin Ironforge",
	race: "Dwarf",
	class: "Fighter",
	level: 5,
	abilityScores: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 13, CHA: 8 },
	hp: { current: 10, max: 10, temp: 0 },
	conditions: [],
	concentration: false,
};

async function fillCharacterForm(page: Page, character: TestCharacter) {
	await page.getByLabel("Name").fill(character.name);
	await page.getByLabel("Race").fill(character.race);
	await page.getByLabel("Class").fill(character.class);
	await page.getByLabel("Level").fill(String(character.level));
	const abilityLabels: Record<string, string> = {
		STR: "Strength (STR)",
		DEX: "Dexterity (DEX)", 
		CON: "Constitution (CON)",
		INT: "Intelligence (INT)",
		WIS: "Wisdom (WIS)",
		CHA: "Charisma (CHA)"
	};
	for (const [key, value] of Object.entries(character.abilityScores)) {
		await page.getByLabel(abilityLabels[key]).fill(String(value));
	}
}

async function createCharacterViaAPI(page: Page, character?: Partial<TestCharacter>) {
	const data = { ...DEFAULT_CHARACTER, ...character };
	const response = await page.request.post("/api/characters", {
		data: {
			name: data.name,
			race: data.race,
			class: data.class,
			level: data.level,
			abilityScores: data.abilityScores,
			hp: data.hp ?? { current: 10, max: 10, temp: 0 },
			conditions: data.conditions ?? [],
			concentration: data.concentration ?? false,
		},
	});
	expect(response.ok()).toBe(true);
	return response.json();
}

async function deleteAllCharacters(page: Page) {
	const response = await page.request.get("/api/characters");
	const characters = await response.json();
	for (const char of characters) {
		await page.request.delete(`/api/characters/${char.id}`);
	}
}

export const test = base.extend<{
	testCharacter: TestCharacter;
	createCharacter: (character?: Partial<TestCharacter>) => Promise<Record<string, unknown>>;
	cleanupCharacters: void;
}>({
	testCharacter: DEFAULT_CHARACTER,
	createCharacter: async ({ page }, use) => {
		await use((character) => createCharacterViaAPI(page, character));
	},
	cleanupCharacters: [
		async ({ page }, use) => {
			await deleteAllCharacters(page);
			await use();
			await deleteAllCharacters(page);
		},
		{ auto: true },
	],
});

export { expect, fillCharacterForm, DEFAULT_CHARACTER };
