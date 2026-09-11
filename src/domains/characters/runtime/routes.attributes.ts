import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { CharacterAttributesService } from "../service/index.js";
import { CharacterAttributesUpdateRequestSchema } from "../types/index.js";
import { parseBody, parseParams, sendCharacterAttributesError } from "./route-helpers.js";

export interface RegisterCharacterAttributesRoutesOptions {
	getCurrentUser: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
	characterAttributesService: CharacterAttributesService;
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
