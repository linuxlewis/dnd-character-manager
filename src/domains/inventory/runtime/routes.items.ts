import type { CurrentUserResponse } from "@providers/auth/current-user.js";
import { getOrCreateCurrentUser } from "@providers/auth/session.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { CharacterService } from "../../characters/service/index.js";
import { CharacterNotFoundError, createCharacterService } from "../../characters/service/index.js";
import type { CharacterItemService } from "../service/index.js";
import {
	CatalogueItemNotFoundError,
	CatalogueItemUnavailableError,
	CharacterItemNotFoundError,
	CharacterItemPersistenceError,
	createCharacterItemService,
} from "../service/index.js";
import {
	CreateCharacterItemRequestSchema,
	ListCharacterItemsRequestSchema,
	UpdateCharacterItemRequestSchema,
} from "../types/index.js";
import {
	CharacterItemDetailPathParamsSchema,
	CharacterItemErrorResponseSchema,
	CharacterItemPathParamsSchema,
} from "./contract-support.js";

const defaultCharacterService = createCharacterService();

export interface RegisterCharacterItemRoutesOptions {
	getCurrentUser?: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>;
	characterService?: Pick<CharacterService, "getCharacter">;
	characterItemService?: CharacterItemService;
}

export async function registerCharacterItemRoutes(
	app: FastifyInstance,
	options: RegisterCharacterItemRoutesOptions = {},
) {
	const getCurrentUser = options.getCurrentUser ?? getOrCreateCurrentUser;
	const characterService = options.characterService ?? defaultCharacterService;
	const itemService =
		options.characterItemService ?? createCharacterItemService({ characterService });

	app.post("/api/characters/:characterId/items", async (request, reply) => {
		const params = parseParams(CharacterItemPathParamsSchema, request, reply);
		if (!params) return;
		const body = parseBody(CreateCharacterItemRequestSchema, request.body, reply);
		if (!body) return;
		try {
			const currentUser = await getCurrentUser(request, reply);
			return reply
				.status(201)
				.send(await itemService.createCharacterItem(currentUser.user.id, params.characterId, body));
		} catch (error) {
			return sendCharacterItemError(error, reply);
		}
	});

	app.get("/api/characters/:characterId/items", async (request, reply) => {
		const params = parseParams(CharacterItemPathParamsSchema, request, reply);
		if (!params) return;
		const query = parseQuery(request, reply);
		if (!query) return;
		try {
			const currentUser = await getCurrentUser(request, reply);
			return await itemService.listCharacterItems(currentUser.user.id, params.characterId, query);
		} catch (error) {
			return sendCharacterItemError(error, reply);
		}
	});

	app.get("/api/characters/:characterId/items/:itemId", async (request, reply) => {
		const params = parseParams(CharacterItemDetailPathParamsSchema, request, reply);
		if (!params) return;
		try {
			const currentUser = await getCurrentUser(request, reply);
			return await itemService.getCharacterItem(
				currentUser.user.id,
				params.characterId,
				params.itemId,
			);
		} catch (error) {
			return sendCharacterItemError(error, reply);
		}
	});

	app.patch("/api/characters/:characterId/items/:itemId", async (request, reply) => {
		const params = parseParams(CharacterItemDetailPathParamsSchema, request, reply);
		if (!params) return;
		const body = parseBody(UpdateCharacterItemRequestSchema, request.body, reply);
		if (!body) return;
		try {
			const currentUser = await getCurrentUser(request, reply);
			return await itemService.updateCharacterItem(
				currentUser.user.id,
				params.characterId,
				params.itemId,
				body,
			);
		} catch (error) {
			return sendCharacterItemError(error, reply);
		}
	});

	app.delete("/api/characters/:characterId/items/:itemId", async (request, reply) => {
		const params = parseParams(CharacterItemDetailPathParamsSchema, request, reply);
		if (!params) return;
		try {
			const currentUser = await getCurrentUser(request, reply);
			await itemService.deleteCharacterItem(currentUser.user.id, params.characterId, params.itemId);
			return reply.status(204).send();
		} catch (error) {
			return sendCharacterItemError(error, reply);
		}
	});

	app.post("/api/characters/:characterId/items/:itemId/equip", async (request, reply) => {
		return equipOrUnequip(itemService, true, request, reply, getCurrentUser);
	});

	app.post("/api/characters/:characterId/items/:itemId/unequip", async (request, reply) => {
		return equipOrUnequip(itemService, false, request, reply, getCurrentUser);
	});
}

async function equipOrUnequip(
	itemService: CharacterItemService,
	equip: boolean,
	request: FastifyRequest,
	reply: FastifyReply,
	getCurrentUser: (request: FastifyRequest, reply: FastifyReply) => Promise<CurrentUserResponse>,
) {
	const params = parseParams(CharacterItemDetailPathParamsSchema, request, reply);
	if (!params) return;
	try {
		const currentUser = await getCurrentUser(request, reply);
		return await (equip
			? itemService.equipCharacterItem(currentUser.user.id, params.characterId, params.itemId)
			: itemService.unequipCharacterItem(currentUser.user.id, params.characterId, params.itemId));
	} catch (error) {
		return sendCharacterItemError(error, reply);
	}
}

function parseParams<TSchema extends z.ZodObject>(
	schema: TSchema,
	request: FastifyRequest,
	reply: FastifyReply,
): z.infer<TSchema> | null {
	const result = schema.safeParse(request.params);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character item path." });
	return null;
}

function parseQuery(request: FastifyRequest, reply: FastifyReply) {
	const result = ListCharacterItemsRequestSchema.safeParse(request.query);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character item filters." });
	return null;
}

function parseBody<TSchema extends z.ZodType>(
	schema: TSchema,
	body: unknown,
	reply: FastifyReply,
): z.infer<TSchema> | null {
	const result = schema.safeParse(body);
	if (result.success) return result.data;
	reply.status(400).send({ error: "Invalid character item request." });
	return null;
}

export function sendCharacterItemError(error: unknown, reply: FastifyReply) {
	if (error instanceof z.ZodError) {
		return reply.status(400).send({ error: "Invalid character item request." });
	}
	if (error instanceof CharacterItemNotFoundError) {
		return reply.status(404).send({ error: "Character item not found." });
	}
	if (error instanceof CharacterNotFoundError) {
		return reply.status(404).send({ error: "Character not found." });
	}
	if (error instanceof CatalogueItemNotFoundError) {
		return reply.status(404).send({ error: "Catalogue item not found." });
	}
	if (error instanceof CatalogueItemUnavailableError) {
		return reply.status(503).send({ error: error.message });
	}
	if (error instanceof CharacterItemPersistenceError) {
		return reply.status(500).send({ error: "Character item operation failed." });
	}
	return reply
		.status(500)
		.send(CharacterItemErrorResponseSchema.parse({ error: "Character item operation failed." }));
}
