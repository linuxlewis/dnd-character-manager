export type { CatalogueBackedSpellClientOptions } from "./catalogue-backed-spell-client.js";
export { createCatalogueBackedSpellClient } from "./catalogue-backed-spell-client.js";
export type {
	CharacterAttributesService,
	CharacterAttributesServiceOptions,
} from "./character-attributes-service.js";
export { createCharacterAttributesService } from "./character-attributes-service.js";
export {
	CharacterNotFoundError,
	SpellSearchUnavailableError,
	SpellSlotDefaultsUnavailableError,
	SpellSlotUnavailableError,
} from "./character-errors.js";
export type { CharacterHealthService } from "./character-health-service.js";
export {
	createCharacterHealthService,
	normalizeHealthUpdate,
	toHealthChange,
} from "./character-health-service.js";
export type { CharacterService } from "./character-service.js";
export { createCharacterService } from "./character-service.js";
export type { CharacterSpellService } from "./character-spell-service.js";
export { createCharacterSpellService } from "./character-spell-service.js";
export type { CharacterSpellSlotService } from "./character-spell-slot-service.js";
export {
	applySpellSlotChange,
	createCharacterSpellSlotService,
	normalizeSpellSlotConfiguration,
} from "./character-spell-slot-service.js";
