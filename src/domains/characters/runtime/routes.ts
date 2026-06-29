import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import {
	type CharacterHealthService,
	CharacterNotFoundError,
	type CharacterService,
	createCharacterHealthService,
	createCharacterService,
} from "../service/index.js";
import {
	CreateCharacterRequestSchema,
	UpdateCharacterHealthRequestSchema,
} from "../types/index.js";
import { CharacterPathParamsSchema } from "./contract.js";

const defaultCharacterService = createCharacterService();
const defaultCharacterHealthService = createCharacterHealthService();

export interface RegisterCharacterRoutesOptions {
	getCurrentUser?: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
	characterService?: CharacterService;
	characterHealthService?: CharacterHealthService;
}

export async function registerCharacterRoutes(
	app: FastifyInstance,
	options: RegisterCharacterRoutesOptions = {},
) {
	const characterService = options.characterService ?? defaultCharacterService;
	const characterHealthService = options.characterHealthService ?? defaultCharacterHealthService;
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
