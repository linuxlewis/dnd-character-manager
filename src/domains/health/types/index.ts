import { z } from "zod";
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

export interface NewHealthChange {
	previous: CharacterHealth;
	next: CharacterHealth;
	currentHpDelta: number;
	maxHpDelta: number;
	temporaryHpDelta: number;
}
