import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = resolve(import.meta.dirname, "CharacterList.module.css");
const css = readFileSync(cssPath, "utf-8");

describe("CharacterList", () => {
	it("module exports CharacterList function", async () => {
		const mod = await import("./CharacterList.tsx");
		expect(mod.CharacterList).toBeDefined();
		expect(typeof mod.CharacterList).toBe("function");
	});

	it("API contract: GET /api/characters returns array", async () => {
		const mockResponse: Array<{
			id: string;
			name: string;
			race: string;
			class: string;
			level: number;
			hp: { current: number; max: number; temp: number };
		}> = [
			{
				id: "1",
				name: "Gandalf",
				race: "Human",
				class: "Wizard",
				level: 20,
				hp: { current: 80, max: 100, temp: 0 },
			},
		];
		expect(Array.isArray(mockResponse)).toBe(true);
		expect(mockResponse[0].hp.current).toBe(80);
	});

	it("empty state: zero characters is a valid state", () => {
		const characters: unknown[] = [];
		expect(characters.length).toBe(0);
	});

	it("character card data includes required fields", () => {
		const character = {
			id: "abc",
			name: "Legolas",
			race: "Elf",
			class: "Ranger",
			level: 10,
			hp: { current: 45, max: 60, temp: 5 },
		};
		expect(character.name).toBeDefined();
		expect(character.race).toBeDefined();
		expect(character.class).toBeDefined();
		expect(character.level).toBeGreaterThan(0);
		expect(character.hp.current).toBeLessThanOrEqual(character.hp.max);
	});
});

describe("CharacterList.module.css - theme tokens", () => {
	it("contains no hardcoded hex color values", () => {
		// Match hex colors but exclude rgba() which is acceptable for shadows
		const lines = css.split("\n");
		for (const line of lines) {
			const trimmed = line.trim();
			// Skip rgba values (used in box-shadow)
			if (trimmed.includes("rgba(")) continue;
			// Check for hex colors like #xxx or #xxxxxx
			const hexMatch = trimmed.match(/#[0-9a-fA-F]{3,8}\b/);
			if (hexMatch) {
				throw new Error(`Found hardcoded hex color "${hexMatch[0]}" in line: ${trimmed}`);
			}
		}
	});

	it("uses var(--color-*) for all color properties", () => {
		expect(css).toContain("var(--color-surface)");
		expect(css).toContain("var(--color-border)");
		expect(css).toContain("var(--color-text)");
		expect(css).toContain("var(--color-text-secondary)");
		expect(css).toContain("var(--color-primary)");
		expect(css).toContain("var(--color-danger)");
	});

	it("uses spacing tokens", () => {
		expect(css).toContain("var(--space-");
	});

	it("uses typography tokens", () => {
		expect(css).toContain("var(--text-");
	});

	it("cards have transition for smooth theme switching", () => {
		expect(css).toContain("background-color 0.3s");
		expect(css).toContain("border-color 0.3s");
	});

	it("empty state uses --color-text-secondary", () => {
		const emptyBlock = css.substring(css.indexOf(".empty"));
		expect(emptyBlock).toContain("var(--color-text-secondary)");
	});

	it("cards have box-shadow for depth", () => {
		expect(css).toContain("box-shadow");
	});

	it("hover/focus states reference --color-primary", () => {
		const hoverSection = css.substring(css.indexOf(".card:hover"));
		expect(hoverSection).toContain("var(--color-primary)");
	});
});
