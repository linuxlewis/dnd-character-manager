import { z } from "zod";
import type { CharacterClass, CharacterSpellSlotConfiguration } from "../types/index.js";

const DND_API_GRAPHQL_ENDPOINT = "https://www.dnd5eapi.co/graphql";

const LevelSpellcastingSchema = z
	.object({
		spell_slots_level_1: z.number().int().min(0),
		spell_slots_level_2: z.number().int().min(0),
		spell_slots_level_3: z.number().int().min(0),
		spell_slots_level_4: z.number().int().min(0),
		spell_slots_level_5: z.number().int().min(0),
		spell_slots_level_6: z.number().int().min(0).nullable().optional(),
		spell_slots_level_7: z.number().int().min(0).nullable().optional(),
		spell_slots_level_8: z.number().int().min(0).nullable().optional(),
		spell_slots_level_9: z.number().int().min(0).nullable().optional(),
	})
	.nullable();

const DndApiSpellSlotResponseSchema = z.object({
	data: z.object({
		level: z
			.object({
				spellcasting: LevelSpellcastingSchema,
			})
			.nullable(),
	}),
});

const GET_CLASS_LEVEL_SPELL_SLOTS = `
	query GetClassLevelSpellSlots($index: String!) {
		level(index: $index) {
			spellcasting {
				spell_slots_level_1
				spell_slots_level_2
				spell_slots_level_3
				spell_slots_level_4
				spell_slots_level_5
				spell_slots_level_6
				spell_slots_level_7
				spell_slots_level_8
				spell_slots_level_9
			}
		}
	}
`;

export interface DndApiSpellSlotClient {
	findDefaultSpellSlots(
		className: CharacterClass,
		level: number,
	): Promise<CharacterSpellSlotConfiguration[]>;
}

export interface DndApiSpellSlotClientOptions {
	endpoint?: string;
	fetcher?: typeof fetch;
}

export class DndApiSpellSlotClientError extends Error {
	constructor() {
		super("D&D spell slot defaults could not be loaded.");
		this.name = "DndApiSpellSlotClientError";
	}
}

export function createDndApiSpellSlotClient(
	options: DndApiSpellSlotClientOptions = {},
): DndApiSpellSlotClient {
	const endpoint = options.endpoint ?? DND_API_GRAPHQL_ENDPOINT;
	const fetcher = options.fetcher ?? fetch;

	return {
		async findDefaultSpellSlots(className, level) {
			try {
				const response = await fetcher(endpoint, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						query: GET_CLASS_LEVEL_SPELL_SLOTS,
						variables: { index: toDndClassLevelIndex(className, level) },
					}),
				});

				if (!response.ok) throw new DndApiSpellSlotClientError();

				const parsed = DndApiSpellSlotResponseSchema.parse(await response.json());
				return toSpellSlotConfigurations(parsed.data.level?.spellcasting ?? null);
			} catch (error) {
				if (error instanceof DndApiSpellSlotClientError) throw error;
				throw new DndApiSpellSlotClientError();
			}
		},
	};
}

export function toDndClassLevelIndex(className: CharacterClass, level: number) {
	return `${className.toLowerCase()}-${level}`;
}

function toSpellSlotConfigurations(
	spellcasting: z.infer<typeof LevelSpellcastingSchema>,
): CharacterSpellSlotConfiguration[] {
	const totals = [
		spellcasting?.spell_slots_level_1 ?? 0,
		spellcasting?.spell_slots_level_2 ?? 0,
		spellcasting?.spell_slots_level_3 ?? 0,
		spellcasting?.spell_slots_level_4 ?? 0,
		spellcasting?.spell_slots_level_5 ?? 0,
		spellcasting?.spell_slots_level_6 ?? 0,
		spellcasting?.spell_slots_level_7 ?? 0,
		spellcasting?.spell_slots_level_8 ?? 0,
		spellcasting?.spell_slots_level_9 ?? 0,
	];
	return totals.map((total, index) => ({ level: index + 1, total }));
}
