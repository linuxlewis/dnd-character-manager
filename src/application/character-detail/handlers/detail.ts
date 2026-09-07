import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { CharacterNotFoundError } from "../../../domains/characters/service/index.js";
import {
	CharacterIdSchema,
	UpdateCharacterExperienceRequestSchema,
	UpdateCharacterLevelRequestSchema,
	UpdateCharacterNameRequestSchema,
} from "../../../domains/characters/types/index.js";
import { createCharacterDetailService } from "../workflows/character-detail.js";
export async function registerCharacterDetailRoutes(
	app: FastifyInstance,
	options: {
		getCurrentUser?: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
		characterService?: ReturnType<typeof createCharacterDetailService>;
	} = {},
) {
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;
	const characterService = options.characterService ?? createCharacterDetailService();
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

	app.put("/api/characters/:characterId/level", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(UpdateCharacterLevelRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			const character = await characterService.updateCharacterLevel(
				currentUser.user.id,
				params.characterId,
				body,
			);
			return { character };
		} catch (error) {
			if (error instanceof CharacterNotFoundError) {
				return reply.status(404).send({ error: "Character not found." });
			}
			throw error;
		}
	});

	app.put("/api/characters/:characterId/name", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(UpdateCharacterNameRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			const character = await characterService.updateCharacterName(
				currentUser.user.id,
				params.characterId,
				body,
			);
			return { character };
		} catch (error) {
			if (error instanceof CharacterNotFoundError) {
				return reply.status(404).send({ error: "Character not found." });
			}
			throw error;
		}
	});

	app.put("/api/characters/:characterId/experience", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(UpdateCharacterExperienceRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await getCurrentUser(request, reply);
		try {
			const character = await characterService.updateCharacterExperience(
				currentUser.user.id,
				params.characterId,
				body,
			);
			return { character };
		} catch (error) {
			if (error instanceof CharacterNotFoundError) {
				return reply.status(404).send({ error: "Character not found." });
			}
			throw error;
		}
	});
}

const CharacterPathParamsSchema = z.object({ characterId: CharacterIdSchema });
function parseParams(request: FastifyRequest, reply: FastifyReply) {
	const result = CharacterPathParamsSchema.safeParse(request.params);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character path." });
	return null;
}

function parseBody<TSchema extends z.ZodType>(
	schema: TSchema,
	body: unknown,
	reply: FastifyReply,
): z.infer<TSchema> | null {
	const result = schema.safeParse(body);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid request body." });
	return null;
}
