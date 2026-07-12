import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { CharacterSpellService } from "../service/index.js";
import {
	SaveCharacterSpellRequestSchema,
	SearchCharacterSpellsRequestSchema,
} from "../types/index.js";
import { parseBody, parseParams, parseSpellParams, sendSpellError } from "./route-helpers.js";

export async function registerCharacterSpellRoutes(
	app: FastifyInstance,
	options: {
		characterSpellService: CharacterSpellService;
		getCurrentUser: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
	},
) {
	const { characterSpellService, getCurrentUser } = options;

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
