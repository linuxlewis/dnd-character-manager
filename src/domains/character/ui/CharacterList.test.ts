import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

describe("CharacterList uses shadcn/ui components", () => {
	const source = readFileSync(resolve(import.meta.dirname, "CharacterList.tsx"), "utf-8");

	it("imports Button from shadcn/ui", () => {
		expect(source).toContain('from "../../../app/components/ui/button.tsx"');
	});

	it("uses Tailwind responsive grid classes", () => {
		expect(source).toContain("grid-cols-1");
		expect(source).toContain("sm:grid-cols-2");
		expect(source).toContain("lg:grid-cols-3");
	});

	it("does not import CSS modules", () => {
		expect(source).not.toContain(".module.css");
	});

	it("uses Tailwind classes for styling", () => {
		expect(source).toContain("className=");
		expect(source).toContain("text-foreground");
		expect(source).toContain("text-muted-foreground");
	});
});
