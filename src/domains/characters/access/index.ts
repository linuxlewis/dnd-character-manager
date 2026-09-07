import type { DatabaseConnection, DatabaseTransaction } from "@providers/database/index.js";
import { and, eq } from "drizzle-orm";
import { charactersTable } from "../schema/index.js";
import { CharacterSummarySchema } from "../types/index.js";

export async function findOwnedCharacter(
	userId: string,
	characterId: string,
	connection: DatabaseConnection,
) {
	const [row] = await ownedCharacterQuery(userId, characterId, connection);
	return row ? CharacterSummarySchema.parse(row) : null;
}

export async function lockOwnedCharacter(
	userId: string,
	characterId: string,
	transaction: DatabaseTransaction,
) {
	const [row] = await ownedCharacterQuery(userId, characterId, transaction).for("update");
	return row ? CharacterSummarySchema.parse(row) : null;
}

function ownedCharacterQuery(userId: string, characterId: string, connection: DatabaseConnection) {
	return connection
		.select({
			id: charactersTable.id,
			name: charactersTable.name,
			className: charactersTable.className,
			level: charactersTable.level,
		})
		.from(charactersTable)
		.where(and(eq(charactersTable.id, characterId), eq(charactersTable.userId, userId)))
		.limit(1);
}
