import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import { CharacterIdSchema } from "../../characters/types/index.js";
import { type CharacterHealthService, createCharacterHealthService } from "../service/index.js";
import { UpdateCharacterHealthRequestSchema } from "../types/index.js";
export async function registerHealthRoutes(
	app: FastifyInstance,
	options: {
		getCurrentUser?: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
		characterHealthService?: CharacterHealthService;
	} = {},
) {
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;
	const characterHealthService = options.characterHealthService ?? createCharacterHealthService();
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
