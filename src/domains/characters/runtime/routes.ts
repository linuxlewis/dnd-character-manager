import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance } from "fastify";
import { type CharacterService, createCharacterService } from "../service/index.js";
export async function registerCharacterRoutes(
	app: FastifyInstance,
	options: {
		characterService?: CharacterService;
		getCurrentUser?: typeof getOrCreateCurrentUser;
	} = {},
) {
	const service = options.characterService ?? createCharacterService();
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;
	app.get("/api/characters", async (request, reply) => {
		const current = await getCurrentUser(request, reply);
		return { characters: await service.listCharacters(current.user.id) };
	});
}
