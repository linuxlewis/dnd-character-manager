import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance } from "fastify";
import {
	type CharacterAttributesService,
	type CharacterService,
	createCharacterAttributesService,
	createCharacterService,
} from "../service/index.js";
import { registerCharacterAttributesRoutes } from "./routes.attributes.js";

export async function registerCharacterRoutes(
	app: FastifyInstance,
	options: {
		characterService?: CharacterService;
		characterAttributesService?: CharacterAttributesService;
		getCurrentUser?: typeof getOrCreateCurrentUser;
	} = {},
) {
	const service = options.characterService ?? createCharacterService();
	const attributesService =
		options.characterAttributesService ?? createCharacterAttributesService();
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;

	app.get("/api/characters", async (request, reply) => {
		const current = await getCurrentUser(request, reply);
		return { characters: await service.listCharacters(current.user.id) };
	});

	await registerCharacterAttributesRoutes(app, {
		characterAttributesService: attributesService,
		getCurrentUser,
	});
}
