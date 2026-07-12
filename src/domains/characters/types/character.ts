import { z } from "zod";

export const CharacterIdSchema = z.string().uuid();
export type CharacterId = z.infer<typeof CharacterIdSchema>;

export const CHARACTER_CLASSES = [
	"Barbarian",
	"Bard",
	"Cleric",
	"Druid",
	"Fighter",
	"Monk",
	"Paladin",
	"Ranger",
	"Rogue",
	"Sorcerer",
	"Warlock",
	"Wizard",
] as const;

export const CharacterClassSchema = z.enum(CHARACTER_CLASSES);
export type CharacterClass = z.infer<typeof CharacterClassSchema>;

export const CharacterUserIdSchema = z.string().uuid();
export const CharacterNameSchema = z.string().min(1).max(120).regex(/\S/);
export const CharacterClassNameSchema = CharacterClassSchema;
export const CharacterLevelSchema = z.number().int().min(1).max(20);
export const HitPointsSchema = z.number().int().min(0).max(9999);
export const MaxHitPointsSchema = z.number().int().min(1).max(9999);
export const SpellSlotLevelSchema = z.number().int().min(1).max(9);
export const SpellSlotCountSchema = z.number().int().min(0).max(99);
export const SpellSlotActionSchema = z.enum(["configured", "used", "restored", "defaults-applied"]);
export type SpellSlotAction = z.infer<typeof SpellSlotActionSchema>;
export const SpellIndexSchema = z
	.string()
	.min(1)
	.max(120)
	.regex(/^[a-z0-9-]+$/);
export type SpellIndex = z.infer<typeof SpellIndexSchema>;
export const SpellNameSchema = z.string().min(1).max(120).regex(/\S/);
export const SpellLevelSchema = z.number().int().min(1).max(20);
export type SpellLevel = z.infer<typeof SpellLevelSchema>;
export const SpellEntrySourceSchema = z.enum(["spell", "feature"]);
export type SpellEntrySource = z.infer<typeof SpellEntrySourceSchema>;
export const SpellApiUrlSchema = z
	.string()
	.min(1)
	.max(240)
	.regex(/^\/api\/(?:2014|2024)\/(?:features|spells)\/[a-z0-9-]+$/);
export const CharacterSpellIdSchema = z.string().uuid();
export type CharacterSpellId = z.infer<typeof CharacterSpellIdSchema>;

export const CharacterHealthSchema = z.object({
	currentHp: HitPointsSchema,
	maxHp: MaxHitPointsSchema,
	temporaryHp: HitPointsSchema,
	effectiveMaxHp: HitPointsSchema,
});
export type CharacterHealth = z.infer<typeof CharacterHealthSchema>;

export const HealthSnapshotSchema = z.object({
	currentHp: HitPointsSchema,
	maxHp: MaxHitPointsSchema,
	temporaryHp: HitPointsSchema,
	effectiveMaxHp: HitPointsSchema,
});
export type HealthSnapshot = z.infer<typeof HealthSnapshotSchema>;

export const HealthChangeResponseSchema = z.object({
	id: z.string().uuid(),
	previous: HealthSnapshotSchema,
	next: HealthSnapshotSchema,
	currentHpDelta: z.number().int(),
	maxHpDelta: z.number().int(),
	temporaryHpDelta: z.number().int(),
	createdAt: z.iso.datetime(),
});
export type HealthChangeResponse = z.infer<typeof HealthChangeResponseSchema>;

export const CreateCharacterRequestSchema = z.object({
	name: CharacterNameSchema,
	className: CharacterClassNameSchema,
	level: CharacterLevelSchema,
	maxHp: MaxHitPointsSchema,
});
export type CreateCharacterRequest = z.infer<typeof CreateCharacterRequestSchema>;

export const CreateCharacterSchema = z.object({
	name: CharacterNameSchema,
	class: CharacterClassSchema,
	level: CharacterLevelSchema,
});
export type CreateCharacter = z.infer<typeof CreateCharacterSchema>;

export const CharacterSchema = z.object({
	id: CharacterIdSchema,
	userId: CharacterUserIdSchema,
	name: CharacterNameSchema,
	class: CharacterClassSchema,
	level: CharacterLevelSchema,
	createdAt: z.date(),
	updatedAt: z.date(),
});
export type Character = z.infer<typeof CharacterSchema>;

export const CharacterResponseSchema = z.object({
	id: CharacterIdSchema,
	name: CharacterNameSchema,
	class: CharacterClassSchema,
	level: CharacterLevelSchema,
	createdAt: z.iso.datetime().optional(),
	updatedAt: z.iso.datetime().optional(),
});
export type CharacterResponse = z.infer<typeof CharacterResponseSchema>;

export const CharacterSummarySchema = z.object({
	id: CharacterIdSchema,
	name: CharacterNameSchema,
	className: CharacterClassNameSchema,
	level: CharacterLevelSchema,
});
export type CharacterSummary = z.infer<typeof CharacterSummarySchema>;

export const CharacterDetailSchema = CharacterSummarySchema.extend({
	health: CharacterHealthSchema,
	recentHealthChanges: z.array(HealthChangeResponseSchema).max(5),
});
export type CharacterDetail = z.infer<typeof CharacterDetailSchema>;

export const ListCharactersResponseSchema = z.object({
	characters: z.array(CharacterSummarySchema),
});
export type ListCharactersResponse = z.infer<typeof ListCharactersResponseSchema>;

export const CharacterDetailResponseSchema = z.object({
	character: CharacterDetailSchema,
});
export type CharacterDetailResponse = z.infer<typeof CharacterDetailResponseSchema>;

export const UpdateCharacterLevelRequestSchema = z.object({
	level: CharacterLevelSchema,
});
export type UpdateCharacterLevelRequest = z.infer<typeof UpdateCharacterLevelRequestSchema>;

export const UpdateCharacterHealthRequestSchema = z.object({
	currentHp: HitPointsSchema,
	maxHp: MaxHitPointsSchema,
	temporaryHp: HitPointsSchema,
});
export type UpdateCharacterHealthRequest = z.infer<typeof UpdateCharacterHealthRequestSchema>;

export const UpdateCharacterHealthResponseSchema = z.object({
	health: CharacterHealthSchema,
	recentHealthChanges: z.array(HealthChangeResponseSchema).max(5),
});
export type UpdateCharacterHealthResponse = z.infer<typeof UpdateCharacterHealthResponseSchema>;

export const CharacterSpellSlotSchema = z.object({
	level: SpellSlotLevelSchema,
	total: SpellSlotCountSchema,
	used: SpellSlotCountSchema,
	remaining: SpellSlotCountSchema,
});
export type CharacterSpellSlot = z.infer<typeof CharacterSpellSlotSchema>;

export const CharacterSpellSlotConfigurationSchema = z.object({
	level: SpellSlotLevelSchema,
	total: SpellSlotCountSchema,
});
export type CharacterSpellSlotConfiguration = z.infer<typeof CharacterSpellSlotConfigurationSchema>;

export const SpellSlotSnapshotSchema = z.object({
	total: SpellSlotCountSchema,
	used: SpellSlotCountSchema,
	remaining: SpellSlotCountSchema,
});
export type SpellSlotSnapshot = z.infer<typeof SpellSlotSnapshotSchema>;

export const SpellSlotChangeResponseSchema = z.object({
	id: z.string().uuid(),
	action: SpellSlotActionSchema,
	level: SpellSlotLevelSchema,
	previous: SpellSlotSnapshotSchema,
	next: SpellSlotSnapshotSchema,
	totalDelta: z.number().int(),
	usedDelta: z.number().int(),
	createdAt: z.iso.datetime(),
});
export type SpellSlotChangeResponse = z.infer<typeof SpellSlotChangeResponseSchema>;

export const UpdateCharacterSpellSlotsRequestSchema = z.object({
	slots: z.array(CharacterSpellSlotConfigurationSchema).max(9).refine(hasUniqueSpellLevels, {
		message: "Spell slot levels must be unique.",
	}),
});
export type UpdateCharacterSpellSlotsRequest = z.infer<
	typeof UpdateCharacterSpellSlotsRequestSchema
>;

export const UseCharacterSpellSlotRequestSchema = z.object({
	level: SpellSlotLevelSchema,
});
export type UseCharacterSpellSlotRequest = z.infer<typeof UseCharacterSpellSlotRequestSchema>;

export const RestoreCharacterSpellSlotRequestSchema = UseCharacterSpellSlotRequestSchema;
export type RestoreCharacterSpellSlotRequest = z.infer<
	typeof RestoreCharacterSpellSlotRequestSchema
>;

export const CharacterSpellSlotsResponseSchema = z.object({
	spellSlots: z.array(CharacterSpellSlotSchema).max(9),
	recentSpellSlotChanges: z.array(SpellSlotChangeResponseSchema).max(5),
});
export type CharacterSpellSlotsResponse = z.infer<typeof CharacterSpellSlotsResponseSchema>;

export const CharacterSpellSchema = z.object({
	id: CharacterSpellIdSchema,
	slotLevel: SpellSlotLevelSchema,
	spellIndex: SpellIndexSchema,
	name: SpellNameSchema,
	level: SpellLevelSchema,
	url: SpellApiUrlSchema,
	source: SpellEntrySourceSchema.default("spell"),
});
export type CharacterSpell = z.infer<typeof CharacterSpellSchema>;

export const CharacterSpellsResponseSchema = z.object({
	spells: z.array(CharacterSpellSchema),
});
export type CharacterSpellsResponse = z.infer<typeof CharacterSpellsResponseSchema>;

export const DndSpellSearchResultSchema = z.object({
	index: SpellIndexSchema,
	name: SpellNameSchema,
	level: SpellLevelSchema,
	url: SpellApiUrlSchema,
	source: SpellEntrySourceSchema.default("spell"),
});
export type DndSpellSearchResult = z.infer<typeof DndSpellSearchResultSchema>;

export const SpellDetailTextSchema = z.string().min(1).max(4_000);
export const SpellDetailMetadataItemSchema = z.object({
	label: z.string().min(1).max(60),
	value: z.string().min(1).max(500),
});
export const DndSpellDetailsSchema = DndSpellSearchResultSchema.extend({
	desc: z.array(SpellDetailTextSchema).min(1).max(20),
	higherLevel: z.array(SpellDetailTextSchema).max(10),
	metadata: z.array(SpellDetailMetadataItemSchema).max(12),
});
export type DndSpellDetails = z.infer<typeof DndSpellDetailsSchema>;

export const CharacterSpellDetailsSchema = CharacterSpellSchema.extend({
	desc: z.array(SpellDetailTextSchema).min(1).max(20),
	higherLevel: z.array(SpellDetailTextSchema).max(10),
	metadata: z.array(SpellDetailMetadataItemSchema).max(12),
});
export type CharacterSpellDetails = z.infer<typeof CharacterSpellDetailsSchema>;

export const CharacterSpellDetailsResponseSchema = z.object({
	spell: CharacterSpellDetailsSchema,
});
export type CharacterSpellDetailsResponse = z.infer<typeof CharacterSpellDetailsResponseSchema>;

export const SearchCharacterSpellsRequestSchema = z.object({
	slotLevel: SpellSlotLevelSchema,
	query: z.string().max(120),
});
export type SearchCharacterSpellsRequest = z.infer<typeof SearchCharacterSpellsRequestSchema>;

export const SearchCharacterSpellsResponseSchema = z.object({
	spells: z.array(DndSpellSearchResultSchema),
});
export type SearchCharacterSpellsResponse = z.infer<typeof SearchCharacterSpellsResponseSchema>;

export const SaveCharacterSpellRequestSchema = z.object({
	slotLevel: SpellSlotLevelSchema,
	spellIndex: SpellIndexSchema,
	source: SpellEntrySourceSchema.default("spell"),
});
export type SaveCharacterSpellRequest = z.infer<typeof SaveCharacterSpellRequestSchema>;

function hasUniqueSpellLevels(slots: CharacterSpellSlotConfiguration[]) {
	return new Set(slots.map((slot) => slot.level)).size === slots.length;
}
