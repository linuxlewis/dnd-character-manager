import { CharacterNotFoundError } from "../../characters/service/index.js";
import type { CharacterSpellSlotRepository, DndApiSpellSlotClient } from "../repo/index.js";
import {
	createCharacterSpellSlotRepository,
	createDndApiSpellSlotClient,
	DndApiSpellSlotClientError,
} from "../repo/index.js";
import { SpellSlotDefaultsUnavailableError } from "../types/errors.js";
import type {
	CharacterSpellSlotsResponse,
	UpdateCharacterSpellSlotsRequest,
	UseCharacterSpellSlotRequest,
} from "../types/index.js";
import { CharacterSpellSlotsResponseSchema } from "../types/index.js";

export interface CharacterSpellSlotService {
	getCharacterSpellSlots(userId: string, characterId: string): Promise<CharacterSpellSlotsResponse>;
	updateCharacterSpellSlots(
		userId: string,
		characterId: string,
		input: UpdateCharacterSpellSlotsRequest,
	): Promise<CharacterSpellSlotsResponse>;
	expendCharacterSpellSlot(
		userId: string,
		characterId: string,
		input: UseCharacterSpellSlotRequest,
	): Promise<CharacterSpellSlotsResponse>;
	restoreCharacterSpellSlot(
		userId: string,
		characterId: string,
		input: UseCharacterSpellSlotRequest,
	): Promise<CharacterSpellSlotsResponse>;
	applyDefaultSpellSlots(userId: string, characterId: string): Promise<CharacterSpellSlotsResponse>;
}

export function createCharacterSpellSlotService(
	repository: CharacterSpellSlotRepository = createCharacterSpellSlotRepository(),
	defaultsClient: DndApiSpellSlotClient = createDndApiSpellSlotClient(),
): CharacterSpellSlotService {
	return {
		async getCharacterSpellSlots(userId, characterId) {
			const spellSlots = await repository.findCharacterSpellSlots(userId, characterId);
			if (!spellSlots) throw new CharacterNotFoundError();
			return CharacterSpellSlotsResponseSchema.parse({
				spellSlots,
				recentSpellSlotChanges: await repository.listRecentSpellSlotChanges(characterId),
			});
		},

		async updateCharacterSpellSlots(userId, characterId, input) {
			return requireResult(
				await repository.mutateCharacterSpellSlots(userId, characterId, {
					action: "configured",
					input,
				}),
			);
		},
		async expendCharacterSpellSlot(userId, characterId, input) {
			return requireResult(
				await repository.mutateCharacterSpellSlots(userId, characterId, { action: "used", input }),
			);
		},
		async restoreCharacterSpellSlot(userId, characterId, input) {
			return requireResult(
				await repository.mutateCharacterSpellSlots(userId, characterId, {
					action: "restored",
					input,
				}),
			);
		},
		async applyDefaultSpellSlots(userId, characterId) {
			let context = await repository.findCharacterSpellSlotContext(userId, characterId);
			if (!context) throw new CharacterNotFoundError();
			for (let attempt = 0; attempt < 2; attempt++) {
				let defaults: Awaited<ReturnType<DndApiSpellSlotClient["findDefaultSpellSlots"]>>;
				try {
					defaults = await defaultsClient.findDefaultSpellSlots(context.className, context.level);
				} catch (error) {
					if (error instanceof DndApiSpellSlotClientError)
						throw new SpellSlotDefaultsUnavailableError();
					throw error;
				}
				const result = await repository.mutateCharacterSpellSlots(userId, characterId, {
					action: "defaults-applied",
					input: { slots: defaults },
					context,
				});
				if (!result) throw new CharacterNotFoundError();
				if (!("status" in result)) return result;
				context = result.context;
			}
			throw new SpellSlotDefaultsUnavailableError();
		},
	};
}
function requireResult(
	result: Awaited<ReturnType<CharacterSpellSlotRepository["mutateCharacterSpellSlots"]>>,
) {
	if (!result) throw new CharacterNotFoundError();
	if ("status" in result) throw new SpellSlotDefaultsUnavailableError();
	return result;
}
