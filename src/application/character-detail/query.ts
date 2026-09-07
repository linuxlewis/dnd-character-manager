import { type DatabaseConnection, getDb } from "@providers/database/index.js";
import { and, desc, eq } from "drizzle-orm";
import { getCharacterExperienceProgress } from "../../domains/characters/config/index.js";
import { charactersTable } from "../../domains/characters/schema/index.js";
import { CharacterNotFoundError } from "../../domains/characters/service/index.js";
import { toCharacterHealth, toHealthChangeResponse } from "../../domains/health/config/index.js";
import { characterHealthEventsTable } from "../../domains/health/schema/index.js";
import { CharacterDetailSchema } from "./types/index.js";

export async function getCharacter(
	userId: string,
	characterId: string,
	connection: DatabaseConnection = getDb(),
) {
	const row = await connection.query.charactersTable.findFirst({
		where: and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)),
		columns: { id: true, name: true, className: true, level: true, experiencePoints: true },
		with: {
			health: { columns: { currentHp: true, maxHp: true, temporaryHp: true } },
			healthEvents: {
				orderBy: desc(characterHealthEventsTable.createdAt),
				limit: 5,
				columns: { characterId: false },
			},
		},
	});
	if (!row?.health) throw new CharacterNotFoundError();
	return CharacterDetailSchema.parse({
		id: row.id,
		name: row.name,
		className: row.className,
		level: row.level,
		experiencePoints: row.experiencePoints,
		experience: getCharacterExperienceProgress(row.level, row.experiencePoints),
		health: toCharacterHealth(row.health),
		recentHealthChanges: row.healthEvents.map(toHealthChangeResponse),
	});
}
