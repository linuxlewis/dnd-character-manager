export const FOUNDRY_DND5E_SOURCE = "foundry-dnd5e";
export const FOUNDRY_DND5E_RULES_VERSION = "2024";
export const FOUNDRY_DND5E_GITHUB_OWNER = "foundryvtt";
export const FOUNDRY_DND5E_GITHUB_REPO = "dnd5e";
export const FOUNDRY_DND5E_GITHUB_REF = "f044ce3b56f3b6d5a122cd9f813f25a5823b4cb6";
export const FOUNDRY_DND5E_SPELLS_PATH_PREFIX = "packs/_source/spells24/";
export const FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX = "packs/_source/equipment24/";
export const FOUNDRY_DND5E_SOURCE_URL = "https://github.com/foundryvtt/dnd5e";

export function foundryDnd5eTreeUrl(ref = FOUNDRY_DND5E_GITHUB_REF) {
	return `https://api.github.com/repos/${FOUNDRY_DND5E_GITHUB_OWNER}/${FOUNDRY_DND5E_GITHUB_REPO}/git/trees/${ref}?recursive=1`;
}

export function foundryDnd5eSourceUrl(path: string, ref = FOUNDRY_DND5E_GITHUB_REF) {
	return foundryDnd5eRawUrl(path, ref);
}

export function foundryDnd5eRawUrl(path: string, ref = FOUNDRY_DND5E_GITHUB_REF) {
	return `https://raw.githubusercontent.com/${FOUNDRY_DND5E_GITHUB_OWNER}/${FOUNDRY_DND5E_GITHUB_REPO}/${ref}/${path}`;
}
