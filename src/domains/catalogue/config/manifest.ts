import { CatalogueSourceManifestSchema } from "../types/manifest.js";
import {
	FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX,
	FOUNDRY_DND5E_GITHUB_REF,
	FOUNDRY_DND5E_RULES_VERSION,
	FOUNDRY_DND5E_SOURCE,
	FOUNDRY_DND5E_SOURCE_URL,
	FOUNDRY_DND5E_SPELLS_PATH_PREFIX,
} from "./index.js";

export const CATALOGUE_SOURCE_MANIFEST = CatalogueSourceManifestSchema.parse({
	source: FOUNDRY_DND5E_SOURCE,
	sourceUrl: FOUNDRY_DND5E_SOURCE_URL,
	sourceRevision: FOUNDRY_DND5E_GITHUB_REF,
	rulesVersion: FOUNDRY_DND5E_RULES_VERSION,
	packs: [
		{ pack: "spells24", capability: "spells", pathPrefix: FOUNDRY_DND5E_SPELLS_PATH_PREFIX },
		{
			pack: "equipment24",
			capability: "equipment",
			pathPrefix: FOUNDRY_DND5E_EQUIPMENT_PATH_PREFIX,
		},
	],
});
