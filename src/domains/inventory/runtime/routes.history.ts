import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { CharacterService } from "../../characters/service/index.js";
import { CharacterNotFoundError, createCharacterService } from "../../characters/service/index.js";
import type { CharacterHistoryService } from "../service/index.js";
import {
	CharacterHistoryPersistenceError,
	createCharacterHistoryService,
} from "../service/index.js";
import { ListCharacterHistoryRequestSchema } from "../types/index.js";
import {
	CharacterHistoryErrorResponseSchema,
	CharacterHistoryPathParamsSchema,
} from "./contract-support.js";

const defaultCharacterService = createCharacterService();

export interface RegisterCharacterHistoryRoutesOptions {
	getCurrentUser?: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
	characterService?: Pick<CharacterService, "getCharacter">;
	characterHistoryService?: CharacterHistoryService;
}

export async function registerCharacterHistoryRoutes(
	app: FastifyInstance,
	options: RegisterCharacterHistoryRoutesOptions = {},
) {
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;
	const characterService = options.characterService ?? defaultCharacterService;
	const historyService =
		options.characterHistoryService ?? createCharacterHistoryService({ characterService });

	app.get("/api/characters/:characterId/history", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;
		const query = parseQuery(request, reply);
		if (!query) return;

		try {
			const currentUser = await getCurrentUser(request, reply);
			return await historyService.listCharacterHistory(
				currentUser.user.id,
				params.characterId,
				query,
			);
		} catch (error) {
			return sendCharacterHistoryError(error, reply);
		}
	});
}

export function parseParams(request: FastifyRequest, reply: FastifyReply) {
	const result = CharacterHistoryPathParamsSchema.safeParse(request.params);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character history path." });
	return null;
}

export function parseQuery(request: FastifyRequest, reply: FastifyReply) {
	const result = ListCharacterHistoryRequestSchema.safeParse(request.query);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character history query." });
	return null;
}

export function sendCharacterHistoryError(error: unknown, reply: FastifyReply) {
	if (error instanceof CharacterNotFoundError) {
		return reply.status(404).send({ error: "Character not found." });
	}
	if (error instanceof CharacterHistoryPersistenceError) {
		return reply.status(500).send({ error: "Character history operation failed." });
	}
	return reply
		.status(500)
		.send(
			CharacterHistoryErrorResponseSchema.parse({ error: "Character history operation failed." }),
		);
}
