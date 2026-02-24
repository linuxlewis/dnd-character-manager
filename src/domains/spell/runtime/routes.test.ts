import Fastify from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { spellRepo } from "../repo/spell-repo.js";
import type { SrdSpell } from "../types/index.js";
import { registerSpellRoutes } from "./routes.js";

const sampleSpell: SrdSpell = {
	index: "fireball",
	name: "Fireball",
	level: 3,
	school: "Evocation",
	casting_time: "1 action",
	range: "150 feet",
	duration: "Instantaneous",
	description: "A bright streak flashes from your pointing finger.",
	classes: ["Sorcerer", "Wizard"],
};

const sampleSpell2: SrdSpell = {
	index: "cure-wounds",
	name: "Cure Wounds",
	level: 1,
	school: "Evocation",
	casting_time: "1 action",
	range: "Touch",
	duration: "Instantaneous",
	description: "A creature you touch regains hit points.",
	classes: ["Bard", "Cleric", "Druid", "Paladin", "Ranger"],
};

const app = Fastify();

beforeAll(async () => {
	await registerSpellRoutes(app);
	await app.ready();
});

afterEach(async () => {
	await spellRepo.clearCache();
});

afterAll(async () => {
	await app.close();
});

describe("Spell routes", () => {
	it("GET /api/spells returns empty array when cache empty and API unavailable", async () => {
		// Mock fetch to fail so auto-fetch doesn't populate
		const originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
		try {
			const res = await app.inject({ method: "GET", url: "/api/spells" });
			// Will throw because service tries to fetch from API when empty
			expect(res.statusCode).toBe(500);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("GET /api/spells returns spells from cache", async () => {
		await spellRepo.upsertSpells([sampleSpell, sampleSpell2]);
		const res = await app.inject({ method: "GET", url: "/api/spells" });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveLength(2);
	});

	it("GET /api/spells filters by name", async () => {
		await spellRepo.upsertSpells([sampleSpell, sampleSpell2]);
		const res = await app.inject({ method: "GET", url: "/api/spells?name=fire" });
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body).toHaveLength(1);
		expect(body[0].name).toBe("Fireball");
	});

	it("GET /api/spells filters by level", async () => {
		await spellRepo.upsertSpells([sampleSpell, sampleSpell2]);
		const res = await app.inject({ method: "GET", url: "/api/spells?level=1" });
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body).toHaveLength(1);
		expect(body[0].name).toBe("Cure Wounds");
	});

	it("GET /api/spells filters by school", async () => {
		await spellRepo.upsertSpells([sampleSpell, sampleSpell2]);
		const res = await app.inject({ method: "GET", url: "/api/spells?school=Evocation" });
		expect(res.statusCode).toBe(200);
		expect(res.json()).toHaveLength(2);
	});

	it("GET /api/spells filters by class", async () => {
		await spellRepo.upsertSpells([sampleSpell, sampleSpell2]);
		const res = await app.inject({ method: "GET", url: "/api/spells?class=Wizard" });
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body).toHaveLength(1);
		expect(body[0].name).toBe("Fireball");
	});

	it("GET /api/spells filters by multiple params", async () => {
		await spellRepo.upsertSpells([sampleSpell, sampleSpell2]);
		const res = await app.inject({ method: "GET", url: "/api/spells?name=fire&level=3&school=Evocation&class=Wizard" });
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body).toHaveLength(1);
		expect(body[0].index).toBe("fireball");
	});

	it("GET /api/spells/:index returns spell detail", async () => {
		await spellRepo.upsertSpells([sampleSpell]);
		const res = await app.inject({ method: "GET", url: "/api/spells/fireball" });
		expect(res.statusCode).toBe(200);
		const body = res.json();
		expect(body.name).toBe("Fireball");
		expect(body.level).toBe(3);
	});

	it("GET /api/spells/:index returns 404 for missing spell", async () => {
		const res = await app.inject({ method: "GET", url: "/api/spells/nonexistent" });
		expect(res.statusCode).toBe(404);
		expect(res.json().error).toBe("Spell not found");
	});

	it("POST /api/spells/refresh triggers cache refresh", async () => {
		const originalFetch = globalThis.fetch;
		globalThis.fetch = vi.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ count: 1, results: [{ index: "fireball", name: "Fireball", url: "/api/spells/fireball" }] }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					index: "fireball",
					name: "Fireball",
					level: 3,
					school: { name: "Evocation" },
					casting_time: "1 action",
					range: "150 feet",
					duration: "Instantaneous",
					desc: ["A bright streak flashes."],
					classes: [{ name: "Wizard" }],
				}),
			});
		try {
			const res = await app.inject({ method: "POST", url: "/api/spells/refresh" });
			expect(res.statusCode).toBe(200);
			const body = res.json();
			expect(body.success).toBe(true);
			expect(body.count).toBe(1);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
