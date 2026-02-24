/**
 * Spell — core domain type for the spell domain.
 *
 * This is the foundation layer. It imports nothing from other layers.
 * All other layers in this domain build on these types.
 */

import { z } from "zod";

export const SrdSpellSchema = z.object({
	index: z.string().min(1),
	name: z.string().min(1),
	level: z.number().int().min(0).max(9),
	school: z.string().min(1),
	casting_time: z.string().min(1),
	range: z.string().min(1),
	duration: z.string().min(1),
	description: z.string(),
	classes: z.array(z.string()),
	cached_at: z.string().optional(),
});

export type SrdSpell = z.infer<typeof SrdSpellSchema>;
