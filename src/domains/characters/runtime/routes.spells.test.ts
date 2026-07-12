import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import type {
	CharacterHealthService,
	CharacterService,
	CharacterSpellService,
	CharacterSpellSlotService,
} from "../service/index.js";
import { SpellSearchUnavailableError } from "../service/index.js";
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

describe("registerCharacterRoutes spell routes", () => {
	it("lists, searches, and saves character spells for the current user", async () => {
		const services = fakeServices();
		const spells = {
			spells: [
				{
					id: "00000000-0000-4000-8000-000000000030",
					slotLevel: 3,
					spellIndex: "magic-missile",
					name: "Magic Missile",
					level: 1,
					url: "/api/2014/spells/magic-missile",
					source: "spell",
				},
			],
		};
		const search = {
			spells: [
				{
					index: "magic-missile",
					name: "Magic Missile",
					level: 1,
					url: "/api/2014/spells/magic-missile",
					source: "spell",
				},
			],
		};
		const details = {
			spell: {
				id: "00000000-0000-4000-8000-000000000030",
				slotLevel: 3,
				spellIndex: "magic-missile",
				name: "Magic Missile",
				level: 1,
				url: "/api/2014/spells/magic-missile",
				source: "spell",
				desc: ["You create three glowing darts of magical force."],
				higherLevel: ["One more dart is created for each slot level above 1st."],
				metadata: [{ label: "Range", value: "120 feet" }],
			},
		};
		services.characterSpellService.listCharacterSpells.mockResolvedValue(spells);
		services.characterSpellService.getCharacterSpellDetails.mockResolvedValue(details);
		services.characterSpellService.searchCharacterSpells.mockResolvedValue(search);
		services.characterSpellService.saveCharacterSpell.mockResolvedValue(spells);
		const app = await buildApp(services);

		try {
			const listResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}/spells`,
			});
			const searchResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spells/search`,
				payload: { slotLevel: 3, query: "miss" },
			});
			const detailsResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${character.id}/spells/00000000-0000-4000-8000-000000000030`,
			});
			const saveResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spells`,
				payload: { slotLevel: 3, spellIndex: "magic-missile", source: "spell" },
			});

			expect(listResponse.json()).toEqual(spells);
			expect(searchResponse.json()).toEqual(search);
			expect(detailsResponse.json()).toEqual(details);
			expect(saveResponse.json()).toEqual(spells);
			expect(services.characterSpellService.getCharacterSpellDetails).toHaveBeenCalledWith(
				userId,
				character.id,
				"00000000-0000-4000-8000-000000000030",
			);
			expect(services.characterSpellService.searchCharacterSpells).toHaveBeenCalledWith(
				userId,
				character.id,
				{ slotLevel: 3, query: "miss" },
			);
			expect(services.characterSpellService.saveCharacterSpell).toHaveBeenCalledWith(
				userId,
				character.id,
				{ slotLevel: 3, spellIndex: "magic-missile", source: "spell" },
			);
		} finally {
			await app.close();
		}
	});

	it("returns bad gateway when D&D spell search cannot be loaded", async () => {
		const services = fakeServices();
		services.characterSpellService.searchCharacterSpells.mockRejectedValue(
			new SpellSearchUnavailableError(),
		);
		const app = await buildApp(services);

		try {
			const response = await app.inject({
				method: "POST",
				url: `/api/characters/${character.id}/spells/search`,
				payload: { slotLevel: 3, query: "miss" },
			});

			expect(response.statusCode).toBe(502);
			expect(response.json()).toEqual({ error: "D&D spells could not be loaded." });
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
