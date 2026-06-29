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
