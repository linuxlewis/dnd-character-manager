import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import {
	type CharacterHealthService,
	CharacterNotFoundError,
	type CharacterService,
	type CharacterSpellService,
	type CharacterSpellSlotService,
} from "../service/index.js";
import { registerCharacterRoutes } from "./routes.js";

const userId = "00000000-0000-4000-8000-000000000001";
const character = {
	id: "00000000-0000-4000-8000-000000000002",
	name: "Nyx",
	className: "Warlock",
	level: 7,
	experiencePoints: 23_000,
	experience: {
		level: 7,
		experiencePoints: 23_000,
		currentLevelMinimum: 23_000,
		nextLevel: 8,
		nextLevelMinimum: 34_000,
		experienceIntoLevel: 0,
		experienceForNextLevel: 11_000,
		experienceRemaining: 11_000,
		progressPercent: 0,
		isMaxLevel: false,
	},
	health: {
		currentHp: 33,
		maxHp: 28,
		temporaryHp: 5,
		effectiveMaxHp: 33,
	},
	recentHealthChanges: [],
};

describe("registerCharacterRoutes experience routes", () => {
	it("updates character experience for the current user", async () => {
		const services = fakeServices();
		const updatedCharacter = {
			...character,
			experiencePoints: 27_000,
			experience: {
				...character.experience,
				experiencePoints: 27_000,
				experienceIntoLevel: 4_000,
				experienceRemaining: 7_000,
				progressPercent: 36,
			},
		};
		services.characterService.updateCharacterExperience.mockResolvedValue(updatedCharacter);
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/experience`,
				payload: { experiencePoints: 27_000 },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ character: updatedCharacter });
			expect(services.characterService.updateCharacterExperience).toHaveBeenCalledWith(
				userId,
				character.id,
				{ experiencePoints: 27_000 },
			);
		} finally {
			await app.close();
		}
	});

	it("rejects invalid character experience updates before calling the service", async () => {
		const services = fakeServices();
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "PUT",
				url: `/api/characters/${character.id}/experience`,
				payload: { experiencePoints: -1 },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toHaveProperty("error");
			expect(services.characterService.updateCharacterExperience).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it("returns not found when a character experience update cannot find the character", async () => {
		const services = fakeServices();
		services.characterService.updateCharacterExperience.mockRejectedValue(
			new CharacterNotFoundError(),
		);
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "PUT",
				url: "/api/characters/00000000-0000-4000-8000-000000000099/experience",
				payload: { experiencePoints: 27_000 },
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
	return {
		updateCharacterHealth: vi.fn(),
	} satisfies CharacterHealthService;
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
