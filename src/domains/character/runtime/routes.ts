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
import {
	CharacterConditionNameSchema,
	type CreateCharacter,
	type UpdateCharacter,
	type LevelUpChoices,
} from "../types/index.js";
import { registerEquipmentRoutes } from "./equipment-routes.js";

export async function registerCharacterRoutes(app: FastifyInstance) {
	app.get("/api/characters", async () => {
		return characterService.listCharacters();
	});

	app.get<{ Params: { slug: string } }>("/api/characters/by-slug/:slug", async (request, reply) => {
		const character = await characterService.getCharacterBySlug(request.params.slug);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		const { id: _id, ...publicCharacter } = character;
		return publicCharacter;
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
		} catch {
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
		} catch {
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

	app.put<{ Params: { id: string } }>("/api/characters/:id/hp/temp", async (request, reply) => {
		const { amount } = request.body as { amount: number };
		const character = await characterService.setTempHp(request.params.id, amount);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});

	app.put<{ Params: { id: string } }>("/api/characters/:id/hp/max", async (request, reply) => {
		const { amount } = request.body as { amount: number };
		const character = await characterService.setMaxHp(request.params.id, amount);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});

	app.put<{ Params: { id: string } }>(
		"/api/characters/:id/concentration",
		async (request, reply) => {
			const { concentration } = request.body as { concentration: boolean };
			const character = await characterService.setConcentration(request.params.id, concentration);
			if (!character) {
				return reply.status(404).send({ error: "Character not found" });
			}
			return character;
		},
	);

	app.post<{ Params: { id: string } }>(
		"/api/characters/:id/conditions/toggle",
		async (request, reply) => {
			try {
				const { conditionName, durationRounds } = request.body as {
					conditionName: string;
					durationRounds?: number | null;
				};
				const parsedName = CharacterConditionNameSchema.parse(conditionName);
				const character = await characterService.toggleCondition(
					request.params.id,
					parsedName,
					durationRounds ?? null,
				);
				if (!character) {
					return reply.status(404).send({ error: "Character not found" });
				}
				return character;
			} catch {
				return reply.status(400).send({ error: "Invalid condition" });
			}
		},
	);

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

	await registerEquipmentRoutes(app);

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

	app.post<{ Params: { id: string; abilityKey: string } }>(
		"/api/characters/:id/saving-throws/:abilityKey/toggle",
		async (request, reply) => {
			const { id, abilityKey } = request.params;
			const validKeys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
			if (!validKeys.includes(abilityKey)) {
				return reply.status(400).send({ error: "Invalid ability key" });
			}
			const character = await characterService.toggleSavingThrowProficiency(
				id,
				abilityKey as "STR" | "DEX" | "CON" | "INT" | "WIS" | "CHA",
			);
			if (!character) {
				return reply.status(404).send({ error: "Character not found" });
			}
			return character;
		},
	);

	app.post<{ Params: { id: string } }>("/api/characters/:id/level-up", async (request, reply) => {
		try {
			const result = await characterService.levelUpCharacter(
				request.params.id,
				request.body as LevelUpChoices
			);
			if (!result) {
				return reply.status(404).send({ error: "Character not found" });
			}
			return result;
		} catch (err) {
			return reply.status(400).send({ error: (err as Error).message });
		}
	});

	app.post<{ Params: { id: string } }>("/api/characters/:id/long-rest", async (request, reply) => {
		const character = await characterService.longRest(request.params.id);
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});
}
