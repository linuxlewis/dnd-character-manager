import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { CharacterNotFoundError } from "../service/index.js";
import { CharacterPathParamsSchema } from "./contract-support.js";

export function parseParams(request: FastifyRequest, reply: FastifyReply) {
	const result = CharacterPathParamsSchema.safeParse(request.params);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character path." });
	return null;
}

export function parseBody<TSchema extends z.ZodType>(
	schema: TSchema,
	body: unknown,
	reply: FastifyReply,
): z.infer<TSchema> | null {
	const result = schema.safeParse(body);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid request body." });
	return null;
}

export function sendCharacterAttributesError(error: unknown, reply: FastifyReply) {
	if (error instanceof CharacterNotFoundError) {
		return reply.status(404).send({ error: "Character not found." });
	}
	throw error;
}
