import { describe, expect, it, vi } from "vitest";
import type {
	CharacterSpellSlotRepository,
	DndApiSpellSlotClient,
	NewSpellSlotChange,
} from "../repo/index.js";
import type { CharacterSpellSlot } from "../types/index.js";
import { CharacterNotFoundError, SpellSlotUnavailableError } from "./character-errors.js";
import {
	applySpellSlotChange,
	createCharacterSpellSlotService,
	normalizeSpellSlotConfiguration,
} from "./character-spell-slot-service.js";

describe("normalizeSpellSlotConfiguration", () => {
	it("updates configured totals and clamps used slots when totals are lowered", () => {
		const previous = makeSlots([{ level: 1, total: 4, used: 3 }]);

		const result = normalizeSpellSlotConfiguration(previous, {
			slots: [{ level: 1, total: 2 }],
		});

		expect(result.next[0]).toEqual({ level: 1, total: 2, used: 2, remaining: 0 });
		expect(result.events).toEqual([
			{
				action: "configured",
				level: 1,
				previous: { level: 1, total: 4, used: 3, remaining: 1 },
				next: { level: 1, total: 2, used: 2, remaining: 0 },
				totalDelta: -2,
				usedDelta: -1,
			},
		]);
	});
});

describe("applySpellSlotChange", () => {
	it("uses and restores one slot while preserving configured totals", () => {
		const previous = makeSlots([{ level: 1, total: 2, used: 0 }]);
		const used = applySpellSlotChange(previous, { level: 1 }, "used");
		const restored = applySpellSlotChange(used.next, { level: 1 }, "restored");

		expect(used.next[0]).toEqual({ level: 1, total: 2, used: 1, remaining: 1 });
		expect(used.event).toMatchObject({ action: "used", usedDelta: 1 });
		expect(restored.next[0]).toEqual({ level: 1, total: 2, used: 0, remaining: 2 });
		expect(restored.event).toMatchObject({ action: "restored", usedDelta: -1 });
	});

	it("rejects usage when no slots remain", () => {
		const previous = makeSlots([{ level: 1, total: 1, used: 1 }]);

		expect(() => applySpellSlotChange(previous, { level: 1 }, "used")).toThrow(
			SpellSlotUnavailableError,
		);
	});
});

describe("createCharacterSpellSlotService", () => {
	it("saves manually configured spell slot totals with history", async () => {
		const repository = fakeRepository();
		repository.findCharacterSpellSlots.mockResolvedValue(makeSlots());
		repository.saveCharacterSpellSlots.mockImplementation(
			async (
				_userId: string,
				_characterId: string,
				slots: CharacterSpellSlot[],
				events: NewSpellSlotChange[],
			) => ({
				spellSlots: slots,
				recentSpellSlotChanges: events.map((event, index) => ({
					id: `00000000-0000-4000-8000-00000000000${index}`,
					...event,
					createdAt: "2026-07-01T12:00:00.000Z",
				})),
			}),
		);

		const result = await createCharacterSpellSlotService(repository).updateCharacterSpellSlots(
			"user-1",
			"character-1",
			{
				slots: [{ level: 1, total: 4 }],
			},
		);

		expect(result.spellSlots).toHaveLength(9);
		expect(result.spellSlots.slice(0, 2)).toEqual([
			{ level: 1, total: 4, used: 0, remaining: 4 },
			{ level: 2, total: 0, used: 0, remaining: 0 },
		]);
		expect(result.recentSpellSlotChanges).toMatchObject([
			{ action: "configured", level: 1, totalDelta: 4 },
		]);
	});

	it("uses D&D API defaults for the character class and level", async () => {
		const repository = fakeRepository();
		const defaultsClient = fakeDefaultsClient();
		repository.findCharacterSpellSlotContext.mockResolvedValue({ className: "Wizard", level: 7 });
		repository.findCharacterSpellSlots.mockResolvedValue(makeSlots());
		repository.saveCharacterSpellSlots.mockImplementation(
			async (
				_userId: string,
				_characterId: string,
				slots: CharacterSpellSlot[],
				events: NewSpellSlotChange[],
			) => ({
				spellSlots: slots,
				recentSpellSlotChanges: events.map((event, index) => ({
					id: `00000000-0000-4000-8000-00000000001${index}`,
					...event,
					createdAt: "2026-07-01T12:00:00.000Z",
				})),
			}),
		);
		defaultsClient.findDefaultSpellSlots.mockResolvedValue([
			{ level: 1, total: 4 },
			{ level: 2, total: 3 },
		]);

		const result = await createCharacterSpellSlotService(
			repository,
			defaultsClient,
		).applyDefaultSpellSlots("user-1", "character-1");

		expect(result.spellSlots).toHaveLength(9);
		expect(result.spellSlots.slice(0, 3)).toEqual([
			{ level: 1, total: 4, used: 0, remaining: 4 },
			{ level: 2, total: 3, used: 0, remaining: 3 },
			{ level: 3, total: 0, used: 0, remaining: 0 },
		]);
		expect(defaultsClient.findDefaultSpellSlots).toHaveBeenCalledWith("Wizard", 7);
		expect(repository.saveCharacterSpellSlots).toHaveBeenCalledWith(
			"user-1",
			"character-1",
			expect.any(Array),
			expect.arrayContaining([expect.objectContaining({ action: "defaults-applied", level: 1 })]),
		);
	});

	it("throws when the character is not owned by the current user", async () => {
		const repository = fakeRepository();
		repository.findCharacterSpellSlots.mockResolvedValue(null);

		await expect(
			createCharacterSpellSlotService(repository).updateCharacterSpellSlots(
				"user-1",
				"character-1",
				{
					slots: [{ level: 1, total: 4 }],
				},
			),
		).rejects.toThrow(CharacterNotFoundError);
	});
});

function makeSlots(
	overrides: Array<{ level: number; total: number; used: number }> = [],
): CharacterSpellSlot[] {
	return Array.from({ length: 9 }, (_, index) => {
		const level = index + 1;
		const override = overrides.find((slot) => slot.level === level);
		const total = override?.total ?? 0;
		const used = override?.used ?? 0;
		return { level, total, used, remaining: total - used };
	});
}

function fakeRepository() {
	return {
		findCharacterSpellSlotContext: vi.fn(),
		findCharacterSpellSlots: vi.fn(),
		listRecentSpellSlotChanges: vi.fn(),
		saveCharacterSpellSlots: vi.fn(),
	} as unknown as CharacterSpellSlotRepository & {
		findCharacterSpellSlotContext: ReturnType<typeof vi.fn>;
		findCharacterSpellSlots: ReturnType<typeof vi.fn>;
		listRecentSpellSlotChanges: ReturnType<typeof vi.fn>;
		saveCharacterSpellSlots: ReturnType<typeof vi.fn>;
	};
}

function fakeDefaultsClient() {
	return {
		findDefaultSpellSlots: vi.fn(),
	} as unknown as DndApiSpellSlotClient & {
		findDefaultSpellSlots: ReturnType<typeof vi.fn>;
	};
}
