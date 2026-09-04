import { z } from "zod";
import { ImmutableSourceRevisionSchema } from "../types/provenance.js";

export const FOUNDRY_DND5E_SOURCE = "foundry-dnd5e";
export const FOUNDRY_DND5E_RULES_VERSION = "2024";
export const FOUNDRY_DND5E_GITHUB_OWNER = "foundryvtt";
export const FOUNDRY_DND5E_GITHUB_REPO = "dnd5e";
export const FOUNDRY_DND5E_GITHUB_REF = "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6";
export const FOUNDRY_DND5E_SPELLS_PATH_PREFIX = "packs/_source/spells24/";
export const FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX = "packs/_source/equipment24/";
export const FOUNDRY_DND5E_SOURCE_URL = "https://github.com/foundryvtt/dnd5e";
export const OPEN5E_API_BASE_URL = "https://api.open5e.com/v2";
export const DND_API_2014_REST_BASE_URL = "https://www.dnd5eapi.co";

const CatalogueRemoteSourceConfigSchema = z.object({
	open5eBaseUrl: z.string().url(),
	legacyBaseUrl: z.string().url(),
});

export function getCatalogueRemoteSourceConfig(
	env: { CATALOGUE_OPEN5E_BASE_URL?: string; CATALOGUE_LEGACY_BASE_URL?: string } = process.env,
) {
	return CatalogueRemoteSourceConfigSchema.parse({
		open5eBaseUrl: env.CATALOGUE_OPEN5E_BASE_URL ?? OPEN5E_API_BASE_URL,
		legacyBaseUrl: env.CATALOGUE_LEGACY_BASE_URL ?? DND_API_2014_REST_BASE_URL,
	});
}

export function foundryDnd5eTreeUrl(ref = FOUNDRY_DND5E_GITHUB_REF) {
	const revision = ImmutableSourceRevisionSchema.parse(ref);
	return `https://api.github.com/repos/${FOUNDRY_DND5E_GITHUB_OWNER}/${FOUNDRY_DND5E_GITHUB_REPO}/git/trees/${revision}?recursive=1`;
}

export function foundryDnd5eSourceUrl(path: string, ref = FOUNDRY_DND5E_GITHUB_REF) {
	return foundryDnd5eRawUrl(path, ref);
}

export function foundryDnd5eRawUrl(path: string, ref = FOUNDRY_DND5E_GITHUB_REF) {
	const revision = ImmutableSourceRevisionSchema.parse(ref);
	return `https://raw.githubusercontent.com/${FOUNDRY_DND5E_GITHUB_OWNER}/${FOUNDRY_DND5E_GITHUB_REPO}/${revision}/${path}`;
}
