import type { CurrentUserResponse } from "@providers/auth/index.js";
import { getOrCreateCurrentUser } from "@providers/auth/index.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";
import { type CharacterService, createCharacterService } from "../service/index.js";
import type { Character, CharacterResponse } from "../types/index.js";
import { CharacterParamsSchema, CreateCharacterSchema } from "../types/index.js";

type CurrentUserResolver = (
	request: FastifyRequest,
	reply: FastifyReply,
) => Promise<CurrentUserResponse>;

export interface CharacterRoutesDependencies {
	getCurrentUser?: CurrentUserResolver;
	service?: CharacterService;
}

export async function registerCharacterRoutes(
	app: FastifyInstance,
	dependencies: CharacterRoutesDependencies = {},
) {
	const getCurrentUser = dependencies.getCurrentUser ?? getOrCreateCurrentUser;
	let service = dependencies.service;
	const getService = () => {
		service ??= createCharacterService();
		return service;
	};

	app.get("/api/characters", async (request, reply) => {
		const { user } = await getCurrentUser(request, reply);
		const characters = await getService().listCharacters(user.id);
		return characters.map(toCharacterResponse);
	});

	app.post("/api/characters", async (request, reply) => {
		const parsedBody = CreateCharacterSchema.safeParse(request.body);
		if (!parsedBody.success) {
			return reply.status(400).send(toValidationError(parsedBody.error));
		}

		const { user } = await getCurrentUser(request, reply);
		const character = await getService().createCharacter({
			userId: user.id,
			character: parsedBody.data,
		});

		return reply.status(201).send(toCharacterResponse(character));
	});

	app.get("/api/characters/:id", async (request, reply) => {
		const parsedParams = CharacterParamsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.status(400).send(toValidationError(parsedParams.error));
		}

		const { user } = await getCurrentUser(request, reply);
		const character = await getService().getCharacter({
			userId: user.id,
			id: parsedParams.data.id,
		});

		if (!character) {
			return reply.status(404).send({ error: "Character not found." });
		}

		return toCharacterResponse(character);
	});
}

export function toCharacterResponse(character: Character): CharacterResponse {
	return {
		id: character.id,
		name: character.name,
		class: character.class,
		level: character.level,
		createdAt: character.createdAt.toISOString(),
		updatedAt: character.updatedAt.toISOString(),
	};
}

function toValidationError(error: ZodError) {
	const issue = error.issues[0];
	return { error: issue?.message ?? "Invalid character data." };
}
