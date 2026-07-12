import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";
import { createCharacterSpellRepository } from "../repo/index.js";

const createdUserIds: string[] = [];

afterEach(async () => {
	resetAuthForTest();
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
	await closeDb();
});

describe("character level route side effects", () => {
	it("updates level without changing spell slots or saved spells", async () => {
		const app = await buildServer();
		try {
			const session = await createSession(app);
			const created = await app.inject({
				method: "POST",
				url: "/api/characters",
				headers: { cookie: session.cookie },
				payload: {
					name: "Tamsin",
					className: "Wizard",
					level: 7,
					maxHp: 30,
				},
			});
			expect(created.statusCode).toBe(201);
			const character = created.json().character;

			const configuredSlots = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/spell-slots`,
				headers: { cookie: session.cookie },
				payload: { slots: [{ level: 1, total: 2 }] },
			});
			expect(configuredSlots.statusCode).toBe(200);

			await createCharacterSpellRepository().saveCharacterSpell(session.userId, character.id, {
				slotLevel: 1,
				source: "spell",
				spellIndex: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
			});

			const initialSpellSlots = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}/spell-slots`,
				headers: { cookie: session.cookie },
			});
			const initialSpells = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}/spells`,
				headers: { cookie: session.cookie },
			});
			expect(initialSpellSlots.statusCode).toBe(200);
			expect(initialSpells.statusCode).toBe(200);

			const levelUpdated = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/level`,
				headers: { cookie: session.cookie },
				payload: { level: 8 },
			});
			expect(levelUpdated.statusCode).toBe(200);
			expect(levelUpdated.json().character.level).toBe(8);

			const currentSpellSlots = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}/spell-slots`,
				headers: { cookie: session.cookie },
			});
			const currentSpells = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}/spells`,
				headers: { cookie: session.cookie },
			});

			expect(currentSpellSlots.statusCode).toBe(200);
			expect(currentSpellSlots.json()).toEqual(initialSpellSlots.json());
			expect(currentSpells.statusCode).toBe(200);
			expect(currentSpells.json()).toEqual(initialSpells.json());
		} finally {
			await app.close();
		}
	});
});

async function createSession(app: Awaited<ReturnType<typeof buildServer>>) {
	const response = await app.inject({ method: "GET", url: "/api/current-user" });
	if (response.statusCode !== 200) {
		throw new Error(`Current user setup failed with ${response.statusCode}: ${response.body}`);
	}
	const userId = response.json().user.id;
	createdUserIds.push(userId);
	return { cookie: toCookieHeader(response.headers["set-cookie"]), userId };
}

function toCookieHeader(setCookie: string | string[] | undefined) {
	const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
	return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
