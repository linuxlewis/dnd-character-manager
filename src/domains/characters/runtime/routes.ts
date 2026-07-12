import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	type CharacterHealthService,
	CharacterNotFoundError,
	type CharacterService,
	type CharacterSpellService,
	type CharacterSpellSlotService,
	createCharacterHealthService,
	createCharacterService,
	createCharacterSpellService,
	createCharacterSpellSlotService,
} from "../service/index.js";
import {
	CreateCharacterRequestSchema,
	RestoreCharacterSpellSlotRequestSchema,
	SaveCharacterSpellRequestSchema,
	SearchCharacterSpellsRequestSchema,
	UpdateCharacterHealthRequestSchema,
	UpdateCharacterSpellSlotsRequestSchema,
	UseCharacterSpellSlotRequestSchema,
} from "../types/index.js";
import {
	parseBody,
	parseParams,
	parseSpellParams,
	sendSpellError,
	sendSpellSlotError,
} from "./route-helpers.js";

const defaultCharacterService = createCharacterService();
const defaultCharacterHealthService = createCharacterHealthService();
const defaultCharacterSpellService = createCharacterSpellService();
const defaultCharacterSpellSlotService = createCharacterSpellSlotService();

export interface RegisterCharacterRoutesOptions {
	getCurrentUser?: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
	characterService?: CharacterService;
	characterHealthService?: CharacterHealthService;
	characterSpellService?: CharacterSpellService;
	characterSpellSlotService?: CharacterSpellSlotService;
}

export async function registerCharacterRoutes(
	app: FastifyInstance,
	options: RegisterCharacterRoutesOptions = {},
) {
	const characterService = options.characterService ?? defaultCharacterService;
	const characterHealthService = options.characterHealthService ?? defaultCharacterHealthService;
	const characterSpellService = options.characterSpellService ?? defaultCharacterSpellService;
	const characterSpellSlotService =
		options.characterSpellSlotService ?? defaultCharacterSpellSlotService;
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;

	app.post("/api/characters", async (request, reply) => {
		const body = parseBody(CreateCharacterRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		const character = await characterService.createCharacter(currentUser.user.id, body);
		return reply.status(201).send({ character });
	});

	app.get("/api/characters", async (request, reply) => {
		const currentUser = await getCurrentUser(request, reply);
		const characters = await characterService.listCharacters(currentUser.user.id);
		return { characters };
	});

	app.get("/api/characters/:characterId", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			const character = await characterService.getCharacter(
				currentUser.user.id,
				params.characterId,
			);
			return { character };
		} catch (error) {
			if (error instanceof CharacterNotFoundError) {
				return reply.status(404).send({ error: "Character not found." });
			}
			throw error;
		}
	});

	app.put("/api/characters/:characterId/health", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(UpdateCharacterHealthRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterHealthService.updateCharacterHealth(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			if (error instanceof CharacterNotFoundError) {
				return reply.status(404).send({ error: "Character not found." });
			}
			throw error;
		}
	});

	app.get("/api/characters/:characterId/spell-slots", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellSlotService.getCharacterSpellSlots(
				currentUser.user.id,
				params.characterId,
			);
		} catch (error) {
			return sendSpellSlotError(error, reply);
		}
	});

	app.put("/api/characters/:characterId/spell-slots", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(UpdateCharacterSpellSlotsRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellSlotService.updateCharacterSpellSlots(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendSpellSlotError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/spell-slots/use", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(UseCharacterSpellSlotRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellSlotService.expendCharacterSpellSlot(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendSpellSlotError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/spell-slots/restore", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(RestoreCharacterSpellSlotRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellSlotService.restoreCharacterSpellSlot(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendSpellSlotError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/spell-slots/apply-defaults", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellSlotService.applyDefaultSpellSlots(
				currentUser.user.id,
				params.characterId,
			);
		} catch (error) {
			return sendSpellSlotError(error, reply);
		}
	});

	app.get("/api/characters/:characterId/spells", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellService.listCharacterSpells(
				currentUser.user.id,
				params.characterId,
			);
		} catch (error) {
			return sendSpellError(error, reply);
		}
	});

	app.get("/api/characters/:characterId/spells/:spellId", async (request, reply) => {
		const params = parseSpellParams(request, reply);
		if (!params) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellService.getCharacterSpellDetails(
				currentUser.user.id,
				params.characterId,
				params.spellId,
			);
		} catch (error) {
			return sendSpellError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/spells/search", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(SearchCharacterSpellsRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellService.searchCharacterSpells(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendSpellError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/spells", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(SaveCharacterSpellRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellService.saveCharacterSpell(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendSpellError(error, reply);
		}
	});

	app.delete("/api/characters/:characterId/spells/:spellId", async (request, reply) => {
		const params = parseSpellParams(request, reply);
		if (!params) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			return await characterSpellService.removeCharacterSpell(
				currentUser.user.id,
				params.characterId,
				params.spellId,
			);
		} catch (error) {
			return sendSpellError(error, reply);
		}
	});
}
