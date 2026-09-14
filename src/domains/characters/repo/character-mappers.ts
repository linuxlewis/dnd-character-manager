import { z } from "zod";
import { type CharacterSummary, CharacterSummarySchema } from "../types/index.js";

const CharacterSummaryRowSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	className: z.string(),
	level: z.number().int(),
});

export function toCharacterSummary(row: unknown): CharacterSummary {
	return CharacterSummarySchema.parse(CharacterSummaryRowSchema.parse(row));
}
