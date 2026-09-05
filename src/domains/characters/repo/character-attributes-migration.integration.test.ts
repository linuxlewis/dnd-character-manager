import { readFileSync } from "node:fs";
import { closeDb, getDatabaseUrl } from "@providers/database/index.js";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const sql = postgres(getDatabaseUrl(), { max: 1 });

afterAll(async () => {
	await closeDb();
	await sql.end();
});

describe("character attributes migration", () => {
	it("backfills a character that existed before migration 0014", async () => {
		const schema = `attributes_migration_${crypto.randomUUID().replaceAll("-", "")}`;
		await sql.unsafe(`CREATE SCHEMA "${schema}"`);
		try {
			await sql.begin(async (tx) => {
				await tx.unsafe(`SET LOCAL search_path TO "${schema}"`);
				await tx.unsafe("CREATE TABLE characters (id uuid PRIMARY KEY)");
				const characterId = crypto.randomUUID();
				await tx`INSERT INTO characters (id) VALUES (${characterId})`;

				const migration = readFileSync("migrations/0014_character_attributes.sql", "utf8");
				await tx.unsafe(migration);

				const rows = await tx`
					SELECT character_id, strength, dexterity, constitution, intelligence, wisdom, charisma
					FROM character_attributes
					WHERE character_id = ${characterId}
				`;
				expect(rows).toEqual([
					{
						character_id: characterId,
						strength: 10,
						dexterity: 10,
						constitution: 10,
						intelligence: 10,
						wisdom: 10,
						charisma: 10,
					},
				]);
			});
		} finally {
			await sql.unsafe(`DROP SCHEMA "${schema}" CASCADE`);
		}
	});
});
