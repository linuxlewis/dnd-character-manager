import { expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import type { CharacterSpellSlotRepository } from "../repo/index.js";
import { createCharacterSpellSlotService } from "./character-spell-slot-service.js";

it("delegates configuration without pre-reading mutable slots", async () => {
	const response = { spellSlots: [], recentSpellSlotChanges: [] };
	const repository = {
		mutateCharacterSpellSlots: vi.fn().mockResolvedValue(response),
	} as unknown as CharacterSpellSlotRepository;
	const input = { slots: [{ level: 1, total: 4 }] };
	expect(
		await createCharacterSpellSlotService(repository).updateCharacterSpellSlots(
			"user",
			"character",
			input,
		),
	).toBe(response);
	expect(repository.mutateCharacterSpellSlots).toHaveBeenCalledExactlyOnceWith(
		"user",
		"character",
		{ action: "configured", input },
	);
});
it("maps missing transaction ownership to character not found", async () => {
	const repository = {
		mutateCharacterSpellSlots: vi.fn().mockResolvedValue(null),
	} as unknown as CharacterSpellSlotRepository;
	await expect(
		createCharacterSpellSlotService(repository).expendCharacterSpellSlot("user", "character", {
			level: 1,
		}),
	).rejects.toThrow(CharacterNotFoundError);
});
