/**
 * Equipment Routes — HTTP runtime layer for equipment endpoints.
 *
 * May import from: types, config, repo, service
 * Must NOT import from: ui
 */

import type { FastifyInstance } from "fastify";
import { characterService } from "../service/character-service.js";
import type { ItemCategory } from "../types/index.js";

export async function registerEquipmentRoutes(app: FastifyInstance) {
	app.post<{ Params: { id: string } }>("/api/characters/:id/equipment", async (request, reply) => {
		const body = request.body as {
			name: string;
			weight: number;
			quantity: number;
			equipped?: boolean;
			category?: string;
			description?: string;
		};
		const character = await characterService.addEquipment(request.params.id, {
			name: body.name,
			quantity: body.quantity,
			weight: body.weight,
			equipped: body.equipped ?? false,
			category: (body.category as ItemCategory) ?? "gear",
			description: body.description ?? "",
		});
		if (!character) {
			return reply.status(404).send({ error: "Character not found" });
		}
		return character;
	});

	app.put<{ Params: { id: string; itemId: string } }>(
		"/api/characters/:id/equipment/:itemId",
		async (request, reply) => {
			try {
				const character = await characterService.updateEquipmentItem(
					request.params.id,
					request.params.itemId,
					request.body as Record<string, unknown>,
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

	app.post<{ Params: { id: string; itemId: string } }>(
		"/api/characters/:id/equipment/:itemId/toggle",
		async (request, reply) => {
			try {
				const character = await characterService.toggleEquipItem(
					request.params.id,
					request.params.itemId,
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
}
