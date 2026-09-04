import { getDb } from "@providers/database/index.js";
import { and, eq } from "drizzle-orm";
import {
	type CharacterAttributesUpdateRequest,
	CharacterAttributesUpdateRequestSchema,
	CharacterIdSchema,
	CharacterUserIdSchema,
	PersistedCharacterProficienciesSchema,
} from "../types/index.js";
import {
	type CharacterAttributesPersistenceState,
	toCharacterAttributesPersistenceState,
} from "./character-attributes-mappers.js";
import {
	characterAttributesTable,
	characterProficienciesTable,
	charactersTable,
} from "./character-table.js";

export type { CharacterAttributesPersistenceState } from "./character-attributes-mappers.js";

export class CharacterAttributesMissingError extends Error {
	constructor() {
		super("Character attributes are missing for an existing character.");
		this.name = "CharacterAttributesMissingError";
	}
}

export interface CharacterAttributesRepository {
	findCharacterAttributes(
		userId: string,
		characterId: string,
	): Promise<CharacterAttributesPersistenceState | null>;
	replaceCharacterAttributes(
		userId: string,
		characterId: string,
		input: CharacterAttributesUpdateRequest,
	): Promise<CharacterAttributesPersistenceState | null>;
}

type Db = ReturnType<typeof getDb>;

export function createCharacterAttributesRepository(
	db: Db = getDb(),
): CharacterAttributesRepository {
	return {
		async findCharacterAttributes(userId, characterId) {
			const ids = parseScope(userId, characterId);
			return db.transaction(
				async (tx) => {
					const [ownedCharacter] = await tx
						.select({ id: charactersTable.id })
						.from(charactersTable)
						.where(
							and(eq(charactersTable.id, ids.characterId), eq(charactersTable.userId, ids.userId)),
						)
						.limit(1);
					if (!ownedCharacter) return null;

					const [attributes] = await tx
						.select(attributeColumns())
						.from(characterAttributesTable)
						.where(eq(characterAttributesTable.characterId, ids.characterId))
						.limit(1);
					if (!attributes) throw new CharacterAttributesMissingError();

					const proficiencies = await tx
						.select(proficiencyColumns())
						.from(characterProficienciesTable)
						.where(eq(characterProficienciesTable.characterId, ids.characterId));
					return toCharacterAttributesPersistenceState(attributes, proficiencies);
				},
				{ isolationLevel: "repeatable read", accessMode: "read only" },
			);
		},

		async replaceCharacterAttributes(userId, characterId, input) {
			const ids = parseScope(userId, characterId);
			const parsedInput = CharacterAttributesUpdateRequestSchema.parse(input);
			const persistedProficiencies = PersistedCharacterProficienciesSchema.parse({
				savingThrowProficiencies: parsedInput.savingThrowProficiencies.filter(
					(entry) => entry.rank !== "none",
				),
				skillProficiencies: parsedInput.skillProficiencies.filter((entry) => entry.rank !== "none"),
			});

			return db.transaction(async (tx) => {
				const [ownedCharacter] = await tx
					.select({ id: charactersTable.id })
					.from(charactersTable)
					.where(
						and(eq(charactersTable.id, ids.characterId), eq(charactersTable.userId, ids.userId)),
					)
					.limit(1)
					.for("update");
				if (!ownedCharacter) return null;

				const [existingAttributes] = await tx
					.select(attributeColumns())
					.from(characterAttributesTable)
					.where(eq(characterAttributesTable.characterId, ids.characterId))
					.limit(1)
					.for("update");
				if (!existingAttributes) throw new CharacterAttributesMissingError();

				await tx
					.update(characterAttributesTable)
					.set({ ...parsedInput.scores, updatedAt: new Date() })
					.where(eq(characterAttributesTable.characterId, ids.characterId));
				await tx
					.delete(characterProficienciesTable)
					.where(eq(characterProficienciesTable.characterId, ids.characterId));

				const rows = [
					...persistedProficiencies.savingThrowProficiencies.map((entry) => ({
						characterId: ids.characterId,
						category: "saving-throw",
						key: entry.key,
						rank: entry.rank,
					})),
					...persistedProficiencies.skillProficiencies.map((entry) => ({
						characterId: ids.characterId,
						category: "skill",
						key: entry.key,
						rank: entry.rank,
					})),
				];
				if (rows.length > 0) await tx.insert(characterProficienciesTable).values(rows);

				const [updatedAttributes] = await tx
					.select(attributeColumns())
					.from(characterAttributesTable)
					.where(eq(characterAttributesTable.characterId, ids.characterId))
					.limit(1);
				if (!updatedAttributes) throw new Error("Character attributes could not be loaded.");
				const updatedProficiencies = await tx
					.select(proficiencyColumns())
					.from(characterProficienciesTable)
					.where(eq(characterProficienciesTable.characterId, ids.characterId));
				return toCharacterAttributesPersistenceState(updatedAttributes, updatedProficiencies);
			});
		},
	};
}

function parseScope(userId: string, characterId: string) {
	return {
		userId: CharacterUserIdSchema.parse(userId),
		characterId: CharacterIdSchema.parse(characterId),
	};
}

function attributeColumns() {
	return {
		characterId: characterAttributesTable.characterId,
		strength: characterAttributesTable.strength,
		dexterity: characterAttributesTable.dexterity,
		constitution: characterAttributesTable.constitution,
		intelligence: characterAttributesTable.intelligence,
		wisdom: characterAttributesTable.wisdom,
		charisma: characterAttributesTable.charisma,
		createdAt: characterAttributesTable.createdAt,
		updatedAt: characterAttributesTable.updatedAt,
	};
}

function proficiencyColumns() {
	return {
		characterId: characterProficienciesTable.characterId,
		category: characterProficienciesTable.category,
		key: characterProficienciesTable.key,
		rank: characterProficienciesTable.rank,
		createdAt: characterProficienciesTable.createdAt,
		updatedAt: characterProficienciesTable.updatedAt,
	};
}
