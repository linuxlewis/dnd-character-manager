/**
 * Character Routes — HTTP runtime layer.
 *
 * May import from: types, config, repo, service
 * Must NOT import from: ui
 *
 * Registers Fastify routes for the character domain.
 */

import type { FastifyInstance } from "fastify";
import { characterService } from "../service/character-service.js";
import type { CreateCharacter, UpdateCharacter } from "../types/index.js";

export async function registerCharacterRoutes(app: FastifyInstance) {
	app.get("/api/characters", async () => {
		return characterService.listCharacters();
	});

	app.get<{ Params: { id: string } }>("/api/characters/:id", async (request, reply) => {
		const character = await characterService.getCharacter(request.params.id);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});

	app.post("/api/characters", async (request, reply) => {
		try {
			const character = await characterService.createCharacter(request.body as CreateCharacter);
			return reply.status(201).send(character);
		} catch (err) {
			return reply.status(400).send({ error: "Invalid character data" });
		}
	});

	app.put<{ Params: { id: string } }>("/api/characters/:id", async (request, reply) => {
		try {
			const character = await characterService.updateCharacter(
				request.params.id,
				request.body as UpdateCharacter,
			);
			if (!character) {
				return reply.status(404).send({ error: "Character not found" });
			}
			return character;
		} catch (err) {
			return reply.status(400).send({ error: "Invalid character data" });
		}
	});

	app.delete<{ Params: { id: string } }>("/api/characters/:id", async (request, reply) => {
		const deleted = await characterService.deleteCharacter(request.params.id);
		if (!deleted) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return reply.status(204).send();
	});
}
