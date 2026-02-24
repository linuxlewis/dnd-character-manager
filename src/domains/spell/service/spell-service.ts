/**
 * Spell Service — orchestration layer for SRD spell data.
 *
 * Fetches spells from the D&D 5e SRD API and caches them locally.
 *
 * May import from: types, config, repo, providers
 * Must NOT import from: runtime, ui
 */

import { createLogger } from "../../../providers/telemetry/logger.js";
import { spellRepo, type SpellSearchFilters } from "../repo/spell-repo.js";
import type { SrdSpell } from "../types/index.js";

const log = createLogger("spell-service");

const SRD_API_BASE = "https://www.dnd5eapi.co/api/spells";

interface SrdApiListResponse {
	count: number;
	results: Array<{ index: string; name: string; url: string }>;
}

interface SrdApiSpellDetail {
	index: string;
	name: string;
	level: number;
	school: { name: string };
	casting_time: string;
	range: string;
	duration: string;
	desc: string[];
	classes: Array<{ name: string }>;
}

/** Map SRD API detail response to domain type. */
function mapApiSpellToDomain(detail: SrdApiSpellDetail): SrdSpell {
	return {
		index: detail.index,
		name: detail.name,
		level: detail.level,
		school: detail.school.name,
		casting_time: detail.casting_time,
		range: detail.range,
		duration: detail.duration,
		description: detail.desc.join("\n"),
		classes: detail.classes.map((c) => c.name),
	};
}

export const spellService = {
	/** Fetch all spells from SRD API and cache them in the database. */
	async fetchAndCacheSpells(): Promise<number> {
		log.info("Fetching spells from SRD API");

		const listRes = await fetch(SRD_API_BASE);
		if (!listRes.ok) {
			throw new Error(`SRD API list request failed: ${listRes.status}`);
		}
		const listData = (await listRes.json()) as SrdApiListResponse;
		log.info({ count: listData.count }, "Fetched spell list from SRD API");

		const spells: SrdSpell[] = [];
		for (const entry of listData.results) {
			try {
				const detailRes = await fetch(`${SRD_API_BASE}/${entry.index}`);
				if (!detailRes.ok) {
					log.warn({ index: entry.index, status: detailRes.status }, "Failed to fetch spell detail, skipping");
					continue;
				}
				const detail = (await detailRes.json()) as SrdApiSpellDetail;
				spells.push(mapApiSpellToDomain(detail));
			} catch (err) {
				log.warn({ index: entry.index, error: err }, "Error fetching spell detail, skipping");
			}
		}

		if (spells.length > 0) {
			await spellRepo.upsertSpells(spells);
		}

		log.info({ cached: spells.length }, "Spells cached successfully");
		return spells.length;
	},

	/** Get spells with optional filters. Auto-fetches from API if cache is empty. */
	async getSpells(filters?: SpellSearchFilters): Promise<SrdSpell[]> {
		const cached = await spellRepo.getAllSpells();
		if (cached.length === 0) {
			log.info("Cache empty, fetching from SRD API");
			await spellService.fetchAndCacheSpells();
			// Re-query after populating cache
			if (filters && Object.keys(filters).length > 0) {
				return spellRepo.searchSpells(filters);
			}
			return spellRepo.getAllSpells();
		}

		if (filters && Object.keys(filters).length > 0) {
			return spellRepo.searchSpells(filters);
		}
		return cached;
	},

	/** Get a single spell by index. */
	async getSpellByIndex(index: string): Promise<SrdSpell | null> {
		log.info({ index }, "Getting spell by index");
		return spellRepo.getSpellByIndex(index);
	},

	/** Clear cache and re-fetch all spells from the SRD API. */
	async refreshCache(): Promise<number> {
		log.info("Refreshing spell cache");
		await spellRepo.clearCache();
		return spellService.fetchAndCacheSpells();
	},
};
