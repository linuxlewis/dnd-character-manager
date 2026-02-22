/**
 * End-to-end integration test: full character lifecycle.
 *
 * Creates a character, edits stats, tracks HP, manages equipment,
 * uses spell slots, and deletes — all through the Fastify routes.
 */
import Fastify from "fastify";
import { beforeAll, describe, expect, it } from "vitest";
import { characterRepo } from "../repo/character-repo.js";
import { registerCharacterRoutes } from "./routes.js";

describe("E2E: full character lifecycle", () => {
	const app = Fastify();
	let charId: string;

	beforeAll(async () => {
		characterRepo._clear();
		await registerCharacterRoutes(app);
		await app.ready();
	});

	it("creates a character", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/characters",
			payload: {
				name: "Gandalf",
				race: "Human",
				class: "Wizard",
				level: 5,
				abilityScores: {
					STR: 8,
					DEX: 14,
					CON: 12,
					INT: 20,
					WIS: 16,
					CHA: 10,
				},
				hp: { current: 32, max: 32, temp: 0 },
				spellSlots: [
					{ level: 1, available: 4, used: 0 },
					{ level: 2, available: 3, used: 0 },
					{ level: 3, available: 2, used: 0 },
				],
				skills: [
					{ name: "Arcana", abilityKey: "INT", proficient: true },
					{ name: "History", abilityKey: "INT", proficient: false },
				],
			},
		});
		expect(res.statusCode).toBe(201);
		const body = res.json();
		charId = body.id;
		expect(body.name).toBe("Gandalf");
		expect(body.level).toBe(5);
	});

	it("edits the character", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/api/characters/${charId}`,
			payload: { level: 6, notes: "Grey wizard" },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().level).toBe(6);
		expect(res.json().notes).toBe("Grey wizard");
	});

	it("deals damage", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${charId}/damage`,
			payload: { amount: 10 },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().hp.current).toBe(22);
	});

	it("heals character", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${charId}/heal`,
			payload: { amount: 5 },
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().hp.current).toBe(27);
	});

	it("adds equipment", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${charId}/equipment`,
			payload: {
				name: "Staff of Power",
				quantity: 1,
				weight: 4,
				equipped: true,
			},
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().equipment).toHaveLength(1);
		expect(res.json().equipment[0].name).toBe("Staff of Power");
	});

	it("adds spell slots and skills via update", async () => {
		const res = await app.inject({
			method: "PUT",
			url: `/api/characters/${charId}`,
			payload: {
				spellSlots: [
					{ level: 1, available: 4, used: 0 },
					{ level: 2, available: 3, used: 0 },
				],
				skills: [
					{ name: "Arcana", abilityKey: "INT", proficient: true },
					{ name: "History", abilityKey: "INT", proficient: false },
				],
			},
		});
		expect(res.statusCode).toBe(200);
		expect(res.json().spellSlots).toHaveLength(2);
		expect(res.json().skills).toHaveLength(2);
	});

	it("uses a spell slot", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${charId}/spells/1/use`,
		});
		expect(res.statusCode).toBe(200);
		const slot = res.json().spellSlots.find((s: { level: number }) => s.level === 1);
		expect(slot.used).toBe(1);
	});

	it("restores a spell slot", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${charId}/spells/1/restore`,
		});
		expect(res.statusCode).toBe(200);
		const slot = res.json().spellSlots.find((s: { level: number }) => s.level === 1);
		expect(slot.used).toBe(0);
	});

	it("toggles skill proficiency", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${charId}/skills/History/toggle`,
		});
		expect(res.statusCode).toBe(200);
		const history = res.json().skills.find((s: { name: string }) => s.name === "History");
		expect(history.proficient).toBe(true);
	});

	it("performs long rest", async () => {
		// Use a slot first
		await app.inject({
			method: "POST",
			url: `/api/characters/${charId}/spells/2/use`,
		});
		const res = await app.inject({
			method: "POST",
			url: `/api/characters/${charId}/long-rest`,
		});
		expect(res.statusCode).toBe(200);
		for (const slot of res.json().spellSlots) {
			expect(slot.used).toBe(0);
		}
	});

	it("deletes the character", async () => {
		const res = await app.inject({
			method: "DELETE",
			url: `/api/characters/${charId}`,
		});
		expect(res.statusCode).toBe(204);

		const getRes = await app.inject({
			method: "GET",
			url: `/api/characters/${charId}`,
		});
		expect(getRes.statusCode).toBe(404);
	});
});

describe("Network config", () => {
	it("Fastify server.ts binds to 0.0.0.0", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");
		const serverSrc = fs.readFileSync(path.resolve(__dirname, "../../../server.ts"), "utf-8");
		expect(serverSrc).toContain('"0.0.0.0"');
		expect(serverSrc).toContain("host");
	});

	it("Vite config binds to 0.0.0.0 with proxy", async () => {
		const fs = await import("node:fs");
		const path = await import("node:path");
		const viteSrc = fs.readFileSync(
			path.resolve(__dirname, "../../../app/vite.config.ts"),
			"utf-8",
		);
		expect(viteSrc).toContain('"0.0.0.0"');
		expect(viteSrc).toContain("/api");
		expect(viteSrc).toContain("proxy");
	});
});
