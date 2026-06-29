import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";
import { createCharacterRepository } from "../repo/index.js";

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

describe("character routes", () => {
	it("creates, returns detail health, updates health, and lists recent changes", async () => {
		const app = await buildServer();
		try {
			const cookie = await createSessionCookie(app);
			const created = await app.inject({
				method: "POST",
				url: "/api/characters",
				headers: { cookie },
				payload: {
					name: "Mira",
					className: "Fighter",
					level: 3,
					maxHp: 28,
				},
			});
			expect(created.statusCode).toBe(201);
			const character = created.json().character;
			expect(character.health).toEqual({
				currentHp: 28,
				maxHp: 28,
				temporaryHp: 0,
				effectiveMaxHp: 28,
			});

			const updated = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/health`,
				headers: { cookie },
				payload: {
					currentHp: 28,
					maxHp: 28,
					temporaryHp: 5,
				},
			});

			expect(updated.statusCode).toBe(200);
			expect(updated.json()).toMatchObject({
				health: {
					currentHp: 33,
					maxHp: 28,
					temporaryHp: 5,
					effectiveMaxHp: 33,
				},
				recentHealthChanges: [
					{
						currentHpDelta: 5,
						maxHpDelta: 0,
						temporaryHpDelta: 5,
					},
				],
			});

			const detail = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}`,
				headers: { cookie },
			});
			expect(detail.statusCode).toBe(200);
			expect(detail.json().character.recentHealthChanges).toHaveLength(1);
		} finally {
			await app.close();
		}
	});

	it("does not expose another session user's character", async () => {
		const app = await buildServer();
		try {
			const ownerUserId = await createUser();
			const ownerCharacter = await createCharacterRepository().createCharacter({
				userId: ownerUserId,
				name: "Mira",
				className: "Fighter",
				level: 3,
				maxHp: 28,
			});
			const otherCookie = await createSessionCookie(app);

			const response = await app.inject({
				method: "GET",
				url: `/api/characters/${ownerCharacter.id}`,
				headers: { cookie: otherCookie },
			});

			expect(response.statusCode).toBe(404);
		} finally {
			await app.close();
		}
	});
});

async function createSessionCookie(app: Awaited<ReturnType<typeof buildServer>>) {
	const response = await app.inject({ method: "GET", url: "/api/current-user" });
	if (response.statusCode !== 200) {
		throw new Error(`Current user setup failed with ${response.statusCode}: ${response.body}`);
	}
	const userId = response.json().user.id;
	createdUserIds.push(userId);
	return toCookieHeader(response.headers["set-cookie"]);
}

async function createUser() {
	const id = crypto.randomUUID();
	createdUserIds.push(id);
	await getDb()
		.insert(userTable)
		.values({
			id,
			name: "Test User",
			email: `${id}@example.test`,
			emailVerified: false,
			isAnonymous: true,
		});
	return id;
}

function toCookieHeader(setCookie: string | string[] | undefined) {
	const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
	return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
