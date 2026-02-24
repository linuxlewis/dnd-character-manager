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

	// --- Action routes ---

	app.post<{ Params: { id: string } }>("/api/characters/:id/damage", async (request, reply) => {
		const { amount } = request.body as { amount: number };
		const character = await characterService.dealDamage(request.params.id, amount);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});

	app.post<{ Params: { id: string } }>("/api/characters/:id/heal", async (request, reply) => {
		const { amount } = request.body as { amount: number };
		const character = await characterService.healCharacter(request.params.id, amount);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});

	app.post<{ Params: { id: string; name: string } }>(
		"/api/characters/:id/skills/:name/toggle",
		async (request, reply) => {
			const character = await characterService.toggleSkillProficiency(
				request.params.id,
				request.params.name,
			);
			if (!character) {
				return reply.status(404).send({ error: "Character not found" });
			}
			return character;
		},
	);

	app.post<{ Params: { id: string } }>("/api/characters/:id/equipment", async (request, reply) => {
		const character = await characterService.addEquipment(request.params.id, {
			...(request.body as { name: string; weight: number; quantity: number }),
			equipped: false,
		});
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});

	app.delete<{ Params: { id: string; itemId: string } }>(
		"/api/characters/:id/equipment/:itemId",
		async (request, reply) => {
			const character = await characterService.removeEquipment(
				request.params.id,
				request.params.itemId,
			);
			if (!character) {
				return reply.status(404).send({ error: "Character not found" });
			}
			return character;
		},
	);

	app.post<{ Params: { id: string; level: string } }>(
		"/api/characters/:id/spells/:level/use",
		async (request, reply) => {
			try {
				const character = await characterService.useSpellSlot(
					request.params.id,
					Number(request.params.level),
				);
				if (!character) {
					return reply.status(404).send({ error: "Character not found" });
				}
				return character;
			} catch (err) {
				return reply.status(400).send({ error: (err as Error).message });
			}
		},
	);

	app.post<{ Params: { id: string; level: string } }>(
		"/api/characters/:id/spells/:level/restore",
		async (request, reply) => {
			const character = await characterService.restoreSpellSlot(
				request.params.id,
				Number(request.params.level),
			);
			if (!character) {
				return reply.status(404).send({ error: "Character not found" });
			}
			return character;
		},
	);

	app.put<{ Params: { id: string } }>("/api/characters/:id/ac", async (request, reply) => {
		const { override } = request.body as { override: number | null };
		const character = await characterService.setAcOverride(request.params.id, override);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});

	app.post<{ Params: { id: string } }>("/api/characters/:id/long-rest", async (request, reply) => {
		const character = await characterService.longRest(request.params.id);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});
}
