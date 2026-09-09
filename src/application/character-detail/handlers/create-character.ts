import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { CreateCharacterRequestSchema } from "../types/index.js";
import { createCharacter } from "../workflows/create-character.js";

export async function registerCharacterCreationRoute(
	app: FastifyInstance,
	options: {
		getCurrentUser?: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
		create?: typeof createCharacter;
	} = {},
) {
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;
	const create = options.create ?? createCharacter;
	app.post("/api/characters", async (request, reply) => {
		const body = CreateCharacterRequestSchema.safeParse(request.body);
		if (!body.success) return reply.status(400).send({ error: "Invalid request body." });
		const currentUser = await getCurrentUser(request, reply);
		const character = await create({ ...body.data, userId: currentUser.user.id });
		return reply.status(201).send({ character });
	});
}
