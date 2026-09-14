import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, afterEach } from "vitest";
import * as schema from "../../src/database/schema.js";
import {
	closeDb,
	type Database,
	getDatabaseUrl,
	getDb,
} from "../../src/providers/database/index.js";

export function spellcastingFixture() {
	const users: string[] = [];
	afterEach(async () => {
		if (users.length)
			await getDb().delete(schema.userTable).where(inArray(schema.userTable.id, users));
		users.length = 0;
	});
	afterAll(closeDb);
	return async () => {
		const owner = randomUUID(),
			stranger = randomUUID(),
			characterId = randomUUID();
		users.push(owner, stranger);
		await getDb()
			.insert(schema.userTable)
			.values(
				[owner, stranger].map((id) => ({ id, name: "Spell test", email: `${id}@example.test` })),
			);
		await getDb()
			.insert(schema.charactersTable)
			.values({ id: characterId, userId: owner, name: "Wizard", className: "Wizard", level: 2 });
		return { owner, stranger, characterId };
	};
}
export function spellcastingConnection() {
	const client = postgres(getDatabaseUrl(), { max: 1, connection: { statement_timeout: 5000 } });
	return { client, db: drizzle(client, { schema }) };
}
export function deferred() {
	let resolve: () => void = () => {};
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
export function holdCommit(database: Database) {
	const entered = deferred(),
		release = deferred();
	const db = new Proxy(database, {
		get(target, key, receiver) {
			if (key !== "transaction") return Reflect.get(target, key, receiver);
			return (callback: Parameters<Database["transaction"]>[0]) =>
				target.transaction(async (tx) => {
					const result = await callback(tx);
					entered.resolve();
					await release.promise;
					return result;
				});
		},
	});
	return { db, entered, release };
}
