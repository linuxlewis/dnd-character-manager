import { getTableName } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { expect, it } from "vitest";
import {
	characterAttributesTable,
	characterProficienciesTable,
	charactersTable,
} from "./tables.js";

it("retains the identity table mapping", () => {
	expect(getTableName(charactersTable)).toBe("characters");
});

it("maps attribute tables and their database constraints", () => {
	const dialect = new PgDialect();
	expect(getTableName(characterAttributesTable)).toBe("character_attributes");
	expect(getTableName(characterProficienciesTable)).toBe("character_proficiencies");
	expectChecks(characterAttributesTable, dialect, [
		["character_attributes_strength_check", '"character_attributes"."strength" BETWEEN 1 AND 30'],
		["character_attributes_dexterity_check", '"character_attributes"."dexterity" BETWEEN 1 AND 30'],
		[
			"character_attributes_constitution_check",
			'"character_attributes"."constitution" BETWEEN 1 AND 30',
		],
		[
			"character_attributes_intelligence_check",
			'"character_attributes"."intelligence" BETWEEN 1 AND 30',
		],
		["character_attributes_wisdom_check", '"character_attributes"."wisdom" BETWEEN 1 AND 30'],
		["character_attributes_charisma_check", '"character_attributes"."charisma" BETWEEN 1 AND 30'],
	]);
	expectChecks(characterProficienciesTable, dialect, [
		[
			"character_proficiencies_category_check",
			`"character_proficiencies"."category" IN ('skill', 'saving-throw')`,
		],
		[
			"character_proficiencies_rank_check",
			`("character_proficiencies"."category" = 'skill' AND "character_proficiencies"."rank" IN ('half', 'proficient', 'expertise')) OR ("character_proficiencies"."category" = 'saving-throw' AND "character_proficiencies"."rank" = 'proficient')`,
		],
	]);
});

function expectChecks(
	table: Parameters<typeof getTableConfig>[0],
	dialect: PgDialect,
	expected: [string, string][],
) {
	expect(
		getTableConfig(table).checks.map((check) => [check.name, dialect.sqlToQuery(check.value).sql]),
	).toEqual(expected);
}
