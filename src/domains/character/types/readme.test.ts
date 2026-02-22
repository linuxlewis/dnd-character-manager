import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const readme = readFileSync(join(process.cwd(), "README.md"), "utf-8");

describe("README.md required sections", () => {
	it("contains project description mentioning D&D 5e character manager", () => {
		expect(readme).toContain("D&D 5e character manager");
	});

	it("contains tech stack listing React 19, Vite 7, Fastify 5, TypeScript, Drizzle ORM", () => {
		expect(readme).toContain("React 19");
		expect(readme).toContain("Vite 7");
		expect(readme).toContain("Fastify 5");
		expect(readme).toContain("TypeScript");
		expect(readme).toContain("Drizzle ORM");
	});

	it("contains setup instructions with pnpm install and pnpm dev", () => {
		expect(readme).toContain("pnpm install");
		expect(readme).toContain("pnpm dev");
	});

	it("documents all package.json scripts", () => {
		const scripts = [
			"pnpm dev",
			"dev:server",
			"dev:web",
			"pnpm build",
			"pnpm test",
			"pnpm lint",
			"lint:fix",
			"pnpm format",
			"db:generate",
			"db:migrate",
		];
		for (const script of scripts) {
			expect(readme).toContain(script);
		}
	});

	it("contains project structure overview with src/domains, src/app, src/providers", () => {
		expect(readme).toContain("src/");
		expect(readme).toContain("domains/");
		expect(readme).toContain("app/");
		expect(readme).toContain("providers/");
	});

	it("documents API endpoints for characters CRUD and action routes", () => {
		expect(readme).toContain("/api/characters");
		expect(readme).toContain("/api/characters/:id");
		expect(readme).toContain("damage");
		expect(readme).toContain("heal");
		expect(readme).toContain("skills");
		expect(readme).toContain("equipment");
		expect(readme).toContain("spells");
		expect(readme).toContain("long-rest");
	});

	it("contains a Screenshots or Usage section", () => {
		expect(readme).toMatch(/##\s+Screenshots/i);
	});

	it("contains a Contributing guidelines section", () => {
		expect(readme).toMatch(/##\s+Contributing/i);
	});
});
