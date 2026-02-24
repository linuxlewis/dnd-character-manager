/**
 * Spell Routes — HTTP runtime layer.
 *
 * May import from: types, config, repo, service
 * Must NOT import from: ui
 *
 * Registers Fastify routes for the spell domain (SRD spell cache).
 */

import type { FastifyInstance } from "fastify";
import { spellService } from "../service/spell-service.js";

interface SpellQuerystring {
	name?: string;
	level?: string;
	school?: string;
	class?: string;
}

export async function registerSpellRoutes(app: FastifyInstance) {
	app.get<{ Querystring: SpellQuerystring }>("/api/spells", async (request) => {
		const { name, level, school, class: className } = request.query;
		const filters: Record<string, string | number> = {};
		if (name) filters.name = name;
		if (level !== undefined && level !== "") filters.level = Number(level);
		if (school) filters.school = school;
		if (className) filters.className = className;

		return spellService.getSpells(
			Object.keys(filters).length > 0 ? filters : undefined,
		);
	});

	app.get<{ Params: { index: string } }>("/api/spells/:index", async (request, reply) => {
		const spell = await spellService.getSpellByIndex(request.params.index);
		if (!spell) {
			return reply.status(404).send({ error: "Spell not found" });
		}
		return spell;
	});

	app.post("/api/spells/refresh", async () => {
		const count = await spellService.refreshCache();
		return { success: true, count };
	});
}
