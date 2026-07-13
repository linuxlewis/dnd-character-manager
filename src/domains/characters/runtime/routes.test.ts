import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
	type CharacterHealthService,
	CharacterNotFoundError,
	type CharacterService,
	type CharacterSpellService,
	type CharacterSpellSlotService,
	SpellSlotDefaultsUnavailableError,
	SpellSlotUnavailableError,
} from "../service/index.js";
import { registerCharacterRoutes } from "./routes.js";

const userId = "00000000-0000-4000-8000-000000000001";
const character = {
	id: "00000000-0000-4000-8000-000000000002",
	name: "Nyx",
	className: "Warlock",
	level: 6,
	health: {
		currentHp: 33,
		maxHp: 28,
		temporaryHp: 5,
		effectiveMaxHp: 33,
	},
	recentHealthChanges: [],
};

describe("registerCharacterRoutes", () => {
	it("creates a character for the current user", async () => {
		const services = fakeServices();
		const service = services.characterService;
		service.createCharacter.mockResolvedValue(character);
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/characters",
				payload: { name: " Nyx ", className: "Warlock", level: 6, maxHp: 28 },
			});

			expect(response.statusCode).toBe(201);
			expect(response.json()).toEqual({ character });
			expect(service.createCharacter).toHaveBeenCalledWith(userId, {
				name: " Nyx ",
				className: "Warlock",
				level: 6,
				maxHp: 28,
			});
		} finally {
			await app.close();
		}
	});

	it("rejects invalid create payloads before calling the service", async () => {
		const services = fakeServices();
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/characters",
				payload: { name: "", className: "", level: 0, maxHp: 0 },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toHaveProperty("error");
			expect(services.characterService.createCharacter).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it("lists and reads characters for the current user", async () => {
		const services = fakeServices();
		const service = services.characterService;
		service.listCharacters.mockResolvedValue([character]);
		service.getCharacter.mockResolvedValue(character);
		const app = await buildApp(services);

		try {
			const listResponse = await app.inject({ method: "GET", url: "/api/characters" });
			const detailResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}`,
			});

			expect(listResponse.json()).toEqual({ characters: [character] });
			expect(detailResponse.json()).toEqual({ character });
		} finally {
			await app.close();
		}
	});

	it("updates character health for the current user", async () => {
		const services = fakeServices();
		services.characterHealthService.updateCharacterHealth.mockResolvedValue({
			health: character.health,
			recentHealthChanges: [],
		});
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/health`,
				payload: { currentHp: 28, maxHp: 28, temporaryHp: 5 },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				health: character.health,
				recentHealthChanges: [],
			});
			expect(services.characterHealthService.updateCharacterHealth).toHaveBeenCalledWith(
				userId,
				character.id,
				{ currentHp: 28, maxHp: 28, temporaryHp: 5 },
			);
		} finally {
			await app.close();
		}
	});

	it("reads, configures, uses, restores, and applies defaults for character spell slots", async () => {
		const services = fakeServices();
		const spellSlots = {
			spellSlots: [{ level: 1, total: 2, used: 1, remaining: 1 }],
			recentSpellSlotChanges: [],
		};
		services.characterSpellSlotService.getCharacterSpellSlots.mockResolvedValue(spellSlots);
		services.characterSpellSlotService.updateCharacterSpellSlots.mockResolvedValue(spellSlots);
		services.characterSpellSlotService.expendCharacterSpellSlot.mockResolvedValue(spellSlots);
		services.characterSpellSlotService.restoreCharacterSpellSlot.mockResolvedValue(spellSlots);
		services.characterSpellSlotService.applyDefaultSpellSlots.mockResolvedValue(spellSlots);
		const app = await buildApp(services);

		try {
			const getResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}/spell-slots`,
			});
			const updateResponse = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/spell-slots`,
				payload: { slots: [{ level: 1, total: 2 }] },
			});
			const useResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spell-slots/use`,
				payload: { level: 1 },
			});
			const restoreResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spell-slots/restore`,
				payload: { level: 1 },
			});
			const defaultsResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spell-slots/apply-defaults`,
			});

			expect(getResponse.json()).toEqual(spellSlots);
			expect(updateResponse.json()).toEqual(spellSlots);
			expect(useResponse.json()).toEqual(spellSlots);
			expect(restoreResponse.json()).toEqual(spellSlots);
			expect(defaultsResponse.json()).toEqual(spellSlots);
			expect(services.characterSpellSlotService.updateCharacterSpellSlots).toHaveBeenCalledWith(
				userId,
				character.id,
				{ slots: [{ level: 1, total: 2 }] },
			);
		} finally {
			await app.close();
		}
	});

	it("returns bad request when spell slot usage is unavailable", async () => {
		const services = fakeServices();
		services.characterSpellSlotService.expendCharacterSpellSlot.mockRejectedValue(
			new SpellSlotUnavailableError("No spell slots remain."),
		);
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spell-slots/use`,
				payload: { level: 1 },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toEqual({ error: "No spell slots remain." });
		} finally {
			await app.close();
		}
	});

	it("returns bad gateway when D&D spell slot defaults cannot be loaded", async () => {
		const services = fakeServices();
		services.characterSpellSlotService.applyDefaultSpellSlots.mockRejectedValue(
			new SpellSlotDefaultsUnavailableError(),
		);
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spell-slots/apply-defaults`,
			});

			expect(response.statusCode).toBe(502);
			expect(response.json()).toEqual({
				error: "D&D spell slot defaults could not be loaded.",
			});
		} finally {
			await app.close();
		}
	});

	it("returns not found for a missing character", async () => {
		const services = fakeServices();
		const service = services.characterService;
		service.getCharacter.mockRejectedValue(new CharacterNotFoundError());
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "GET",
				url: "/api/characters/00000000-0000-4000-8000-000000000099",
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toEqual({ error: "Character not found." });
		} finally {
			await app.close();
		}
	});
});

async function buildApp(services: ReturnType<typeof fakeServices>) {
	const app = Fastify();
	await registerCharacterRoutes(app, {
		characterService: services.characterService,
		characterHealthService: services.characterHealthService,
		characterSpellService: services.characterSpellService,
		characterSpellSlotService: services.characterSpellSlotService,
		getCurrentUser: async () => ({
			user: {
				id: userId,
				isAnonymous: true,
				name: "Anonymous",
			},
		}),
	});
	return app;
}

function fakeServices() {
	return {
		characterService: fakeService(),
		characterHealthService: fakeHealthService(),
		characterSpellService: fakeSpellService(),
		characterSpellSlotService: fakeSpellSlotService(),
	};
}

function fakeService() {
	return {
		createCharacter: vi.fn(),
		getCharacter: vi.fn(),
		listCharacters: vi.fn(),
		updateCharacterExperience: vi.fn(),
		updateCharacterLevel: vi.fn(),
		updateCharacterName: vi.fn(),
	} satisfies CharacterService;
}
function fakeHealthService() {
	return { updateCharacterHealth: vi.fn() } satisfies CharacterHealthService;
}
function fakeSpellService() {
	return {
		getCharacterSpellDetails: vi.fn(),
		listCharacterSpells: vi.fn(),
		removeCharacterSpell: vi.fn(),
		saveCharacterSpell: vi.fn(),
		searchCharacterSpells: vi.fn(),
	} satisfies CharacterSpellService;
}
function fakeSpellSlotService() {
	return {
		applyDefaultSpellSlots: vi.fn(),
		expendCharacterSpellSlot: vi.fn(),
		getCharacterSpellSlots: vi.fn(),
		restoreCharacterSpellSlot: vi.fn(),
		updateCharacterSpellSlots: vi.fn(),
	} satisfies CharacterSpellSlotService;
}
