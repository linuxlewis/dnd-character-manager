import type {
	CharacterSpellSlotRepository,
	DndApiSpellSlotClient,
	NewSpellSlotChange,
} from "../repo/index.js";
import {
	createCharacterSpellSlotRepository,
	createDndApiSpellSlotClient,
	DndApiSpellSlotClientError,
} from "../repo/index.js";
import type {
	CharacterSpellSlot,
	CharacterSpellSlotsResponse,
	UpdateCharacterSpellSlotsRequest,
	UseCharacterSpellSlotRequest,
} from "../types/index.js";
import { CharacterSpellSlotSchema, CharacterSpellSlotsResponseSchema } from "../types/index.js";
import {
	CharacterNotFoundError,
	SpellSlotDefaultsUnavailableError,
	SpellSlotUnavailableError,
} from "./character-errors.js";

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
			const previous = await repository.findCharacterSpellSlots(userId, characterId);
			if (!previous) throw new CharacterNotFoundError();
			const update = normalizeSpellSlotConfiguration(previous, input);
			return saveSpellSlots(repository, userId, characterId, update.next, update.events);
		},

		async expendCharacterSpellSlot(userId, characterId, input) {
			const previous = await repository.findCharacterSpellSlots(userId, characterId);
			if (!previous) throw new CharacterNotFoundError();
			const update = applySpellSlotChange(previous, input, "used");
			return saveSpellSlots(repository, userId, characterId, update.next, [update.event]);
		},

		async restoreCharacterSpellSlot(userId, characterId, input) {
			const previous = await repository.findCharacterSpellSlots(userId, characterId);
			if (!previous) throw new CharacterNotFoundError();
			const update = applySpellSlotChange(previous, input, "restored");
			return saveSpellSlots(repository, userId, characterId, update.next, [update.event]);
		},

		async applyDefaultSpellSlots(userId, characterId) {
			const context = await repository.findCharacterSpellSlotContext(userId, characterId);
			if (!context) throw new CharacterNotFoundError();
			const previous = await repository.findCharacterSpellSlots(userId, characterId);
			if (!previous) throw new CharacterNotFoundError();

			try {
				const defaults = await defaultsClient.findDefaultSpellSlots(
					context.className,
					context.level,
				);
				const update = normalizeSpellSlotConfiguration(
					previous,
					{ slots: defaults },
					"defaults-applied",
				);
				return saveSpellSlots(repository, userId, characterId, update.next, update.events);
			} catch (error) {
				if (error instanceof DndApiSpellSlotClientError) {
					throw new SpellSlotDefaultsUnavailableError();
				}
				throw error;
			}
		},
	};
}

export function normalizeSpellSlotConfiguration(
	previous: CharacterSpellSlot[],
	input: UpdateCharacterSpellSlotsRequest,
	action: "configured" | "defaults-applied" = "configured",
): { next: CharacterSpellSlot[]; events: NewSpellSlotChange[] } {
	const configuredByLevel = new Map(input.slots.map((slot) => [slot.level, slot.total]));
	const next = previous.map((slot) => {
		const total = configuredByLevel.get(slot.level) ?? slot.total;
		return toSpellSlot(slot.level, total, Math.min(slot.used, total));
	});
	const events = next
		.map((slot, index) => toSpellSlotChange(action, previous[index], slot))
		.filter((event): event is NewSpellSlotChange => event !== null);

	return { next, events };
}

export function applySpellSlotChange(
	previous: CharacterSpellSlot[],
	input: UseCharacterSpellSlotRequest,
	action: "used" | "restored",
): { next: CharacterSpellSlot[]; event: NewSpellSlotChange } {
	const slot = previous.find((candidate) => candidate.level === input.level);
	if (!slot) throw new SpellSlotUnavailableError("Spell slot level is not configured.");

	if (action === "used" && slot.remaining <= 0) {
		throw new SpellSlotUnavailableError("No spell slots remain.");
	}
	if (action === "restored" && slot.used <= 0) {
		throw new SpellSlotUnavailableError("No used spell slots to restore.");
	}

	const changedSlot = toSpellSlot(
		slot.level,
		slot.total,
		action === "used" ? slot.used + 1 : slot.used - 1,
	);
	const next = previous.map((candidate) =>
		candidate.level === input.level ? changedSlot : candidate,
	);
	const event = toSpellSlotChange(action, slot, changedSlot);
	if (!event) throw new SpellSlotUnavailableError();

	return { next, event };
}

async function saveSpellSlots(
	repository: CharacterSpellSlotRepository,
	userId: string,
	characterId: string,
	slots: CharacterSpellSlot[],
	events: NewSpellSlotChange[],
) {
	const result = await repository.saveCharacterSpellSlots(userId, characterId, slots, events);
	if (!result) throw new CharacterNotFoundError();
	return result;
}

function toSpellSlot(level: number, total: number, used: number) {
	return CharacterSpellSlotSchema.parse({
		level,
		total,
		used,
		remaining: total - used,
	});
}

function toSpellSlotChange(
	action: NewSpellSlotChange["action"],
	previous: CharacterSpellSlot,
	next: CharacterSpellSlot,
): NewSpellSlotChange | null {
	const totalDelta = next.total - previous.total;
	const usedDelta = next.used - previous.used;
	if (totalDelta === 0 && usedDelta === 0) return null;
	return {
		action,
		level: next.level,
		previous,
		next,
		totalDelta,
		usedDelta,
	};
}
