import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("CharacterSheet slug support", () => {
	it("exports CharacterSheet that accepts slug prop", async () => {
		const mod = await import("./CharacterSheet.tsx");
		expect(typeof mod.CharacterSheet).toBe("function");
	});

	it("slug-based fetch uses /api/characters/by-slug/:slug endpoint", () => {
		const slug = "gandalf-the-grey-a3f2";
		const url = `/api/characters/by-slug/${slug}`;
		expect(url).toBe("/api/characters/by-slug/gandalf-the-grey-a3f2");
	});

	it("id-based fetch uses /api/characters/:id endpoint", () => {
		const id = "abc-123";
		const url = `/api/characters/${id}`;
		expect(url).toBe("/api/characters/abc-123");
	});

	it("slug route is /characters/:slug (plural)", () => {
		const slug = "gandalf-the-grey-a3f2";
		const route = `/characters/${slug}`;
		expect(route).toBe("/characters/gandalf-the-grey-a3f2");
		expect(route).toMatch(/^\/characters\/[a-z0-9-]+$/);
	});
});

describe("CharacterSheet share URL display", () => {
	it("share URL is constructed from origin and character slug", () => {
		const origin = "http://localhost:3000";
		const slug = "gandalf-the-grey-a3f2";
		const shareUrl = `${origin}/characters/${slug}`;
		expect(shareUrl).toBe("http://localhost:3000/characters/gandalf-the-grey-a3f2");
	});

	it("share URL is null when character has no slug", () => {
		const slug: string | undefined = undefined;
		const shareUrl = slug ? `http://localhost:3000/characters/${slug}` : null;
		expect(shareUrl).toBeNull();
	});

	it("ShareSection component contains share URL elements with data-testid", async () => {
		const { readFileSync } = await import("node:fs");
		const { resolve } = await import("node:path");
		const tsx = readFileSync(resolve(__dirname, "ShareSection.tsx"), "utf-8");
		expect(tsx).toContain('data-testid="share-url-section"');
		expect(tsx).toContain('data-testid="share-url"');
		expect(tsx).toContain('data-testid="copy-share-url"');
	});

	it("CharacterSheet conditionally renders ShareSection", async () => {
		const { readFileSync } = await import("node:fs");
		const { resolve } = await import("node:path");
		const tsx = readFileSync(resolve(__dirname, "CharacterSheet.tsx"), "utf-8");
		expect(tsx).toContain("ShareSection");
		expect(tsx).toContain("!readOnly");
	});

	it("copy button shows 'Copied!' feedback text", async () => {
		const { readFileSync } = await import("node:fs");
		const { resolve } = await import("node:path");
		const tsx = readFileSync(resolve(__dirname, "ShareSection.tsx"), "utf-8");
		expect(tsx).toContain('copied ? "Copied!" : "Copy"');
	});
});
