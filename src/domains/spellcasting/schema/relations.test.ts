import { createTableRelationsHelpers, getTableName, One } from "drizzle-orm";
import { expect, it } from "vitest";
import * as relations from "./relations.js";

it.each(
	Object.values(relations),
)("relates each feature row through its character_id", (relation) => {
	const { character } = relation.config(createTableRelationsHelpers(relation.table));
	expect(character).toBeInstanceOf(One);
	expect(getTableName(character.referencedTable)).toBe("characters");
	expect(character.config?.fields.map((field) => field.name)).toEqual(["character_id"]);
	expect(character.config?.references.map((field) => field.name)).toEqual(["id"]);
});
