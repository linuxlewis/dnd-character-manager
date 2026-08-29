import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import type { CharacterService } from "../../characters/service/index.js";
import { CharacterNotFoundError, createCharacterService } from "../../characters/service/index.js";
import type { CharacterTreasuryService } from "../service/index.js";
import {
	createCharacterTreasuryService,
	InsufficientDenominationError,
	InsufficientFundsError,
	TreasuryOverflowError,
} from "../service/index.js";
import {
	AddCharacterTreasuryRequestSchema,
	ConvertCharacterTreasuryRequestSchema,
	SpendCharacterTreasuryRequestSchema,
} from "../types/index.js";
import { CharacterTreasuryPathParamsSchema } from "./contract-support.js";

const defaultCharacterService = createCharacterService();

export interface RegisterCharacterTreasuryRoutesOptions {
	getCurrentUser?: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
	characterService?: Pick<CharacterService, "getCharacter">;
	characterTreasuryService?: CharacterTreasuryService;
}

export async function registerCharacterTreasuryRoutes(
	app: FastifyInstance,
	options: RegisterCharacterTreasuryRoutesOptions = {},
) {
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;
	const characterService = options.characterService ?? defaultCharacterService;
	const treasuryService =
		options.characterTreasuryService ?? createCharacterTreasuryService({ characterService });

	app.get("/api/characters/:characterId/treasury", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;
		const currentUser = await getCurrentUser(request, reply);
		try {
			return await treasuryService.getCharacterTreasury(currentUser.user.id, params.characterId);
		} catch (error) {
			return sendTreasuryError(error, reply);
		}
	});

	app.put("/api/characters/:characterId/treasury", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;
		const body = parseBody(AddCharacterTreasuryRequestSchema, request.body, reply);
		if (!body) return;
		const currentUser = await getCurrentUser(request, reply);
		try {
			return await treasuryService.addCharacterTreasury(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendTreasuryError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/treasury/spend", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;
		const body = parseBody(SpendCharacterTreasuryRequestSchema, request.body, reply);
		if (!body) return;
		const currentUser = await getCurrentUser(request, reply);
		try {
			return await treasuryService.spendCharacterTreasury(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendTreasuryError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/treasury/convert", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;
		const body = parseBody(ConvertCharacterTreasuryRequestSchema, request.body, reply);
		if (!body) return;
		const currentUser = await getCurrentUser(request, reply);
		try {
			return await treasuryService.convertCharacterTreasury(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendTreasuryError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/treasury/preview/add", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;
		const body = parseBody(AddCharacterTreasuryRequestSchema, request.body, reply);
		if (!body) return;
		const currentUser = await getCurrentUser(request, reply);
		try {
			return await treasuryService.previewAddCharacterTreasury(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendTreasuryError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/treasury/preview/spend", async (request, reply) => {
		const params = parseParams(request, reply);
		if (!params) return;
		const body = parseBody(SpendCharacterTreasuryRequestSchema, request.body, reply);
		if (!body) return;
		const currentUser = await getCurrentUser(request, reply);
		try {
			return await treasuryService.previewSpendCharacterTreasury(
				currentUser.user.id,
				params.characterId,
				body,
			);
		} catch (error) {
			return sendTreasuryError(error, reply);
		}
	});
}

export function parseParams(request: FastifyRequest, reply: FastifyReply) {
	const result = CharacterTreasuryPathParamsSchema.safeParse(request.params);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character path." });
	return null;
}

function parseBody<TSchema extends z.ZodType>(
	schema: TSchema,
	body: unknown,
	reply: FastifyReply,
): z.infer<TSchema> | null {
	const result = schema.safeParse(body);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid request body." });
	return null;
}

export function sendTreasuryError(error: unknown, reply: FastifyReply) {
	if (error instanceof CharacterNotFoundError) {
		return reply.status(404).send({ error: "Character not found." });
	}
	if (error instanceof InsufficientFundsError) {
		return reply.status(409).send({ error: error.details });
	}
	if (error instanceof InsufficientDenominationError) {
		return reply.status(409).send({ error: error.details });
	}
	if (error instanceof TreasuryOverflowError) {
		return reply.status(400).send({ error: error.message });
	}
	throw error;
}
