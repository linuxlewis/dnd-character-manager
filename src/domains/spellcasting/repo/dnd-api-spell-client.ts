import type { DndSpellDetails, DndSpellSearchResult, SpellEntrySource } from "../types/index.js";

/** Character-facing spell lookup contract; source integrations live in catalogue. */
export interface DndApiSpellClient {
	searchSpells(input: { slotLevel: number; query: string }): Promise<DndSpellSearchResult[]>;
	findSpell(spellIndex: string, source?: SpellEntrySource): Promise<DndSpellSearchResult>;
	getSpellDetails(spellIndex: string, source?: SpellEntrySource): Promise<DndSpellDetails>;
}

export class DndApiSpellClientError extends Error {
	constructor() {
		super("D&D spells could not be loaded.");
		this.name = "DndApiSpellClientError";
	}
}
