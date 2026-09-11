import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../../../app-server.js";

const createdUserIds: string[] = [];

beforeEach(async () => {
	await cleanupCreatedUsers();
});

afterEach(async () => {
	resetAuthForTest();
	await cleanupCreatedUsers();
});

async function cleanupCreatedUsers() {
	if (createdUserIds.length === 0) return;
	try {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
	} finally {
		createdUserIds.length = 0;
	}
}

afterAll(async () => {
	await closeDb();
});

describe("character attributes routes", () => {
	it("returns defaults, atomically saves proficiencies, and recalculates after a level change", async () => {
		const app = await buildServer();
		try {
			const cookie = await createSessionCookie(app);
			const characterResponse = await app.inject({
				method: "POST",
				url: "/api/characters",
				headers: { cookie },
				payload: { name: "Mira", className: "Fighter", level: 1, maxHp: 10 },
			});
			const characterId = characterResponse.json().character.id;

			const defaults = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/attributes`,
				headers: { cookie },
			});
			expect(defaults.statusCode).toBe(200);
			expect(defaults.json().attributes).toMatchObject({
				scores: defaultScores(),
				modifiers: defaultModifiers(),
				proficiencyBonus: 2,
			});

			const saved = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/attributes`,
				headers: { cookie },
				payload: configuredAttributes(),
			});
			expect(saved.statusCode).toBe(200);
			expect(findRoll(saved.json(), "skill-stealth")).toMatchObject({
				total: 7,
				proficiencyRank: "expertise",
				components: [
					{ type: "ability", label: "Dexterity", value: 3 },
					{ type: "proficiency", label: "Expertise", value: 4 },
				],
			});
			expect(findRoll(saved.json(), "skill-perception").total).toBe(4);
			expect(findRoll(saved.json(), "saving-throw-wisdom").total).toBe(4);
			expect(findRoll(saved.json(), "initiative").total).toBe(3);
			expect(findRoll(saved.json(), "passive-perception").total).toBe(14);

			const invalid = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/attributes`,
				headers: { cookie },
				payload: {
					...configuredAttributes(),
					scores: { ...configuredAttributes().scores, strength: 31 },
				},
			});
			expect(invalid.statusCode).toBe(400);

			const levelUpdated = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/level`,
				headers: { cookie },
				payload: { level: 5 },
			});
			expect(levelUpdated.statusCode).toBe(200);

			const afterLevel = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/attributes`,
				headers: { cookie },
			});
			expect(afterLevel.statusCode).toBe(200);
			expect(afterLevel.json().attributes.proficiencyBonus).toBe(3);
			expect(findRoll(afterLevel.json(), "skill-stealth")).toMatchObject({
				total: 9,
				proficiencyRank: "expertise",
			});
			expect(findRoll(afterLevel.json(), "skill-perception").total).toBe(5);
			expect(findRoll(afterLevel.json(), "saving-throw-wisdom").total).toBe(5);
			expect(findRoll(afterLevel.json(), "passive-perception").total).toBe(15);

			const persistedAfterInvalid = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/attributes`,
				headers: { cookie },
			});
			expect(persistedAfterInvalid.json().attributes.scores.strength).toBe(10);
		} finally {
			await app.close();
		}
	});

	it("does not expose another user's attributes or accept their update", async () => {
		const app = await buildServer();
		try {
			const ownerCookie = await createSessionCookie(app);
			const created = await app.inject({
				method: "POST",
				url: "/api/characters",
				headers: { cookie: ownerCookie },
				payload: { name: "Mira", className: "Fighter", level: 1, maxHp: 10 },
			});
			const characterId = created.json().character.id;
			const otherCookie = await createSessionCookie(app);

			const getResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/attributes`,
				headers: { cookie: otherCookie },
			});
			const updateResponse = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/attributes`,
				headers: { cookie: otherCookie },
				payload: configuredAttributes(),
			});

			expect(getResponse.statusCode).toBe(404);
			expect(updateResponse.statusCode).toBe(404);
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
	createdUserIds.push(response.json().user.id);
	const setCookie = response.headers["set-cookie"];
	const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
	return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

function defaultScores() {
	return {
		strength: 10,
		dexterity: 10,
		constitution: 10,
		intelligence: 10,
		wisdom: 10,
		charisma: 10,
	};
}

function defaultModifiers() {
	return {
		strength: 0,
		dexterity: 0,
		constitution: 0,
		intelligence: 0,
		wisdom: 0,
		charisma: 0,
	};
}

function configuredAttributes() {
	return {
		scores: { ...defaultScores(), dexterity: 16, wisdom: 14 },
		savingThrowProficiencies: [
			{ key: "strength", rank: "none" },
			{ key: "dexterity", rank: "none" },
			{ key: "constitution", rank: "none" },
			{ key: "intelligence", rank: "none" },
			{ key: "wisdom", rank: "proficient" },
			{ key: "charisma", rank: "none" },
		],
		skillProficiencies: [
			"athletics",
			"acrobatics",
			"sleight-of-hand",
			"stealth",
			"arcana",
			"history",
			"investigation",
			"nature",
			"religion",
			"animal-handling",
			"insight",
			"medicine",
			"perception",
			"survival",
			"deception",
			"intimidation",
			"performance",
			"persuasion",
		].map((key) => ({
			key,
			rank: key === "stealth" ? "expertise" : key === "perception" ? "proficient" : "none",
		})),
	};
}

function findRoll(
	response: { attributes: { rollReference: Array<{ id: string; total: number }> } },
	id: string,
) {
	const roll = response.attributes.rollReference.find((entry) => entry.id === id);
	if (!roll) throw new Error(`Roll ${id} was not returned.`);
	return roll;
}
