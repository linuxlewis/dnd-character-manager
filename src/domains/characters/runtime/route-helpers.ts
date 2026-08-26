import type { FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import {
	CharacterNotFoundError,
	SpellSearchUnavailableError,
	SpellSlotDefaultsUnavailableError,
	SpellSlotUnavailableError,
} from "../service/index.js";
import { CharacterPathParamsSchema, CharacterSpellPathParamsSchema } from "./contract-support.js";

export function parseParams(request: FastifyRequest, reply: FastifyReply) {
	const result = CharacterPathParamsSchema.safeParse(request.params);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character path." });
	return null;
}

export function parseSpellParams(request: FastifyRequest, reply: FastifyReply) {
	const result = CharacterSpellPathParamsSchema.safeParse(request.params);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character spell path." });
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

export function sendSpellSlotError(error: unknown, reply: FastifyReply) {
	if (error instanceof CharacterNotFoundError) {
		return reply.status(404).send({ error: "Character not found." });
	}
	if (error instanceof SpellSlotUnavailableError) {
		return reply.status(400).send({ error: error.message });
	}
	if (error instanceof SpellSlotDefaultsUnavailableError) {
		return reply.status(502).send({ error: error.message });
	}
	throw error;
}

export function sendSpellError(error: unknown, reply: FastifyReply) {
	if (error instanceof CharacterNotFoundError) {
		return reply.status(404).send({ error: "Character not found." });
	}
	if (error instanceof SpellSlotUnavailableError) {
		return reply.status(400).send({ error: error.message });
	}
	if (error instanceof SpellSearchUnavailableError) {
		return reply.status(502).send({ error: error.message });
	}
	throw error;
}
