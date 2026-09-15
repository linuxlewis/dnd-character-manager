import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { CharacterAttributesService } from "../service/index.js";
import { CharacterNotFoundError } from "../service/index.js";
import { CharacterAttributesUpdateRequestSchema, CharacterIdSchema } from "../types/index.js";

const CharacterPathParamsSchema = z.object({ characterId: CharacterIdSchema });

export interface RegisterCharacterAttributesRoutesOptions {
	getCurrentUser: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
	characterAttributesService: CharacterAttributesService;
}

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

function sendCharacterAttributesError(error: unknown, reply: FastifyReply) {
	if (error instanceof CharacterNotFoundError) {
		return reply.status(404).send({ error: "Character not found." });
	}
	throw error;
}

export async function registerCharacterAttributesRoutes(
	app: FastifyInstance,
	options: RegisterCharacterAttributesRoutesOptions,
) {
	app.get("/api/characters/:characterId/attributes", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const currentUser = await options.getCurrentUser(request, reply);
		try {
			return await options.characterAttributesService.getCharacterAttributes(
				currentUser.user.id,
				params.characterId,
			);
		} catch (error) {
			return sendCharacterAttributesError(error, reply);
		}
	});

	app.put("/api/characters/:characterId/attributes", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;

		const body = parseBody(CharacterAttributesUpdateRequestSchema, request.body, reply);
		if (!body) return;

		const currentUser = await options.getCurrentUser(request, reply);
		try {
			return await options.characterAttributesService.updateCharacterAttributes(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendCharacterAttributesError(error, reply);
		}
	});
}
