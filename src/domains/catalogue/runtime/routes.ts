import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	type CatalogueItemService,
	CatalogueItemsUnavailableError,
	createCatalogueItemService,
} from "../service/index.js";
import {
	CatalogueItemIdSchema,
	CatalogueItemSearchQuerySchema,
	CatalogueItemsUnavailableResponseSchema,
} from "../types/index.js";

const ItemPathParamsSchema = z.object({ catalogueItemId: CatalogueItemIdSchema });

export interface RegisterCatalogueRoutesOptions {
	itemService?: CatalogueItemService;
}

const defaultItemService = createCatalogueItemService();

export async function registerCatalogueRoutes(
	app: FastifyInstance,
	options: RegisterCatalogueRoutesOptions = {},
) {
	const itemService = options.itemService ?? defaultItemService;

	app.get("/api/catalogue/items", async (request, reply) => {
		const query = parseQuery(request, reply);
		if (!query) return;
		try {
			const result = await itemService.searchItems(query);
			return { readiness: "ready", ...result };
		} catch (error) {
			return sendCatalogueError(error, reply);
		}
	});

	app.get("/api/catalogue/items/:catalogueItemId", async (request, reply) => {
		const params = ItemPathParamsSchema.safeParse(request.params);
		if (!params.success) return reply.status(400).send({ error: "Invalid catalogue item id." });
		try {
			const item = await itemService.getItemDetails(params.data.catalogueItemId);
			if (!item) return reply.status(404).send({ error: "Catalogue item not found." });
			return item;
		} catch (error) {
			return sendCatalogueError(error, reply);
		}
	});

	app.get("/api/catalogue/status", async () => itemService.getStatus());
}

function parseQuery(request: FastifyRequest, reply: FastifyReply) {
	const parsed = CatalogueItemSearchQuerySchema.safeParse(request.query);
	if (parsed.success) return parsed.data;
	reply.status(400).send({ error: "Invalid catalogue item search." });
	return null;
}

export function sendCatalogueError(error: unknown, reply: FastifyReply) {
	if (error instanceof CatalogueItemsUnavailableError) {
		return reply.status(503).send(
			CatalogueItemsUnavailableResponseSchema.parse({
				readiness: "unavailable",
				capability: "items",
				code: "catalogue_items_unavailable",
				error: error.message,
			}),
		);
	}
	throw error;
}
