import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { spellService } from "./spell-service.js";
import { spellRepo } from "../repo/spell-repo.js";
import type { SrdSpell } from "../types/index.js";

// Mock the repo
vi.mock("../repo/spell-repo.js", () => ({
	spellRepo: {
		upsertSpells: vi.fn().mockResolvedValue(undefined),
		getAllSpells: vi.fn().mockResolvedValue([]),
		getSpellByIndex: vi.fn().mockResolvedValue(null),
		searchSpells: vi.fn().mockResolvedValue([]),
		clearCache: vi.fn().mockResolvedValue(undefined),
	},
}));

const mockSpell: SrdSpell = {
	index: "fireball",
	name: "Fireball",
	level: 3,
	school: "Evocation",
	casting_time: "1 action",
	range: "150 feet",
	duration: "Instantaneous",
	description: "A bright streak flashes.",
	classes: ["Sorcerer", "Wizard"],
};

const mockApiListResponse = {
	count: 2,
	results: [
		{ index: "fireball", name: "Fireball", url: "/api/spells/fireball" },
		{ index: "cure-wounds", name: "Cure Wounds", url: "/api/spells/cure-wounds" },
	],
};

const mockApiFireball = {
	index: "fireball",
	name: "Fireball",
	level: 3,
	school: { name: "Evocation" },
	casting_time: "1 action",
	range: "150 feet",
	duration: "Instantaneous",
	desc: ["A bright streak flashes.", "Each creature in range must make a Dex save."],
	classes: [{ name: "Sorcerer" }, { name: "Wizard" }],
};

const mockApiCureWounds = {
	index: "cure-wounds",
	name: "Cure Wounds",
	level: 1,
	school: { name: "Evocation" },
	casting_time: "1 action",
	range: "Touch",
	duration: "Instantaneous",
	desc: ["A creature you touch regains hit points."],
	classes: [{ name: "Bard" }, { name: "Cleric" }],
};

describe("spellService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("fetchAndCacheSpells", () => {
		it("fetches spell list and details from SRD API and upserts", async () => {
			const mockFetch = vi.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiListResponse) })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiFireball) })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiCureWounds) });
			vi.stubGlobal("fetch", mockFetch);

			const count = await spellService.fetchAndCacheSpells();

			expect(count).toBe(2);
			expect(mockFetch).toHaveBeenCalledTimes(3);
			expect(spellRepo.upsertSpells).toHaveBeenCalledOnce();
			const upsertedSpells = vi.mocked(spellRepo.upsertSpells).mock.calls[0][0];
			expect(upsertedSpells).toHaveLength(2);
			expect(upsertedSpells[0].index).toBe("fireball");
			expect(upsertedSpells[0].description).toBe("A bright streak flashes.\nEach creature in range must make a Dex save.");
			expect(upsertedSpells[1].index).toBe("cure-wounds");
		});

		it("throws on list API failure", async () => {
			vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false, status: 500 }));
			await expect(spellService.fetchAndCacheSpells()).rejects.toThrow("SRD API list request failed: 500");
		});

		it("skips spells whose detail fetch fails", async () => {
			const mockFetch = vi.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiListResponse) })
				.mockResolvedValueOnce({ ok: false, status: 404 })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiCureWounds) });
			vi.stubGlobal("fetch", mockFetch);

			const count = await spellService.fetchAndCacheSpells();
			expect(count).toBe(1);
		});

		it("skips spells whose detail fetch throws", async () => {
			const mockFetch = vi.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiListResponse) })
				.mockRejectedValueOnce(new Error("network error"))
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiCureWounds) });
			vi.stubGlobal("fetch", mockFetch);

			const count = await spellService.fetchAndCacheSpells();
			expect(count).toBe(1);
		});
	});

	describe("getSpells", () => {
		it("returns cached spells when cache is populated", async () => {
			vi.mocked(spellRepo.getAllSpells).mockResolvedValueOnce([mockSpell]);

			const result = await spellService.getSpells();
			expect(result).toEqual([mockSpell]);
		});

		it("auto-fetches when cache is empty", async () => {
			vi.mocked(spellRepo.getAllSpells)
				.mockReset()
				.mockResolvedValueOnce([])  // first check: empty
				.mockResolvedValueOnce([mockSpell]);  // after fetch

			// Mock fetch for the auto-fetch
			const mockFetch = vi.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ count: 1, results: [{ index: "fireball", name: "Fireball", url: "/api/spells/fireball" }] }) })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiFireball) });
			vi.stubGlobal("fetch", mockFetch);

			const result = await spellService.getSpells();
			expect(mockFetch).toHaveBeenCalled();
			expect(result).toEqual([mockSpell]);
		});

		it("delegates to searchSpells when filters provided", async () => {
			vi.mocked(spellRepo.getAllSpells).mockResolvedValueOnce([mockSpell]);
			vi.mocked(spellRepo.searchSpells).mockResolvedValueOnce([mockSpell]);

			const result = await spellService.getSpells({ level: 3 });
			expect(spellRepo.searchSpells).toHaveBeenCalledWith({ level: 3 });
			expect(result).toEqual([mockSpell]);
		});
	});

	describe("getSpellByIndex", () => {
		it("returns spell from repo", async () => {
			vi.mocked(spellRepo.getSpellByIndex).mockResolvedValueOnce(mockSpell);
			const result = await spellService.getSpellByIndex("fireball");
			expect(result).toEqual(mockSpell);
			expect(spellRepo.getSpellByIndex).toHaveBeenCalledWith("fireball");
		});

		it("returns null when not found", async () => {
			const result = await spellService.getSpellByIndex("nonexistent");
			expect(result).toBeNull();
		});
	});

	describe("refreshCache", () => {
		it("clears cache and re-fetches", async () => {
			const mockFetch = vi.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ count: 1, results: [{ index: "fireball", name: "Fireball", url: "/api/spells/fireball" }] }) })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockApiFireball) });
			vi.stubGlobal("fetch", mockFetch);

			const count = await spellService.refreshCache();
			expect(spellRepo.clearCache).toHaveBeenCalledOnce();
			expect(count).toBe(1);
		});
	});
});
