import { closeDb, getDatabaseUrl } from "@providers/database/index.js";
import postgres from "postgres";
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { createCharacterRepo } from "./character-repo.js";

const sql = postgres(getDatabaseUrl(), { max: 1 });
const createdUserIds: string[] = [];

afterEach(async () => {
	for (const userId of createdUserIds) {
		await sql`DELETE FROM "user" WHERE id = ${userId}`;
	}
	createdUserIds.length = 0;
});

afterAll(async () => {
	await closeDb();
	await sql.end();
});

describe("createCharacterRepo", () => {
	it("creates, lists, and finds characters scoped to one user", async () => {
		const userId = await createUser();
		const otherUserId = await createUser();
		const repo = createCharacterRepo();

		const first = await repo.create({
			userId,
			name: "Mira",
			class: "Rogue",
			level: 2,
		});
		await new Promise((resolve) => setTimeout(resolve, 5));
		const second = await repo.create({
			userId,
			name: "Mira",
			class: "Wizard",
			level: 3,
		});
		await repo.create({
			userId: otherUserId,
			name: "Hidden",
			class: "Wizard",
			level: 1,
		});

		await expect(repo.findByIdForUser({ id: first.id, userId })).resolves.toMatchObject({
			name: "Mira",
			class: "Rogue",
			level: 2,
		});
		await expect(repo.findByIdForUser({ id: first.id, userId: otherUserId })).resolves.toBeNull();
		await expect(repo.listByUser(userId)).resolves.toMatchObject([
			{ id: second.id, name: "Mira" },
			{ id: first.id, name: "Mira" },
		]);
	});
});

async function createUser() {
	const [user] = await sql<{ id: string }[]>`
		INSERT INTO "user" (name, email, is_anonymous)
		VALUES ('Anonymous', ${`${crypto.randomUUID()}@anonymous.local`}, true)
		RETURNING id
	`;

	if (!user) throw new Error("User insert did not return a row.");
	createdUserIds.push(user.id);
	return user.id;
}
