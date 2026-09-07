import { registerAnonymousAccountLinkHandler, registerAuthRoutes } from "@providers/auth/index.js";
import { closeDb } from "@providers/database/index.js";
import { createOpenApiDocument } from "@providers/openapi/index.js";
import { createLogger } from "@providers/telemetry/index.js";
import Fastify from "fastify";
import { apiRouteContracts } from "./api-contracts.js";
import { registerCharacterCreationRoute } from "./application/character-detail/handlers/create-character.js";
import { registerCharacterDetailRoutes } from "./application/character-detail/handlers/detail.js";
import { registerCatalogueRoutes } from "./domains/catalogue/runtime/index.js";
import { registerCharacterRoutes } from "./domains/characters/runtime/index.js";
import { createCharacterService } from "./domains/characters/service/index.js";
import { registerHealthRoutes } from "./domains/health/runtime/index.js";
import {
	registerCharacterHistoryRoutes,
	registerCharacterItemRoutes,
	registerCharacterTreasuryRoutes,
} from "./domains/inventory/runtime/index.js";
import { registerStaticAssetFallback } from "./static-assets.js";

const log = createLogger("app-server");

export interface BuildServerOptions {
	staticRoot?: string;
}

export async function buildServer(options: BuildServerOptions = {}) {
	const app = Fastify({
		logger: false,
		genReqId: () => crypto.randomUUID(),
	});

	app.addHook("onRequest", async (request) => {
		request.headers["x-request-start"] = String(performance.now());
	});

	app.addHook("onResponse", async (request, reply) => {
		const started = Number(request.headers["x-request-start"] ?? performance.now());
		log.info(
			{
				requestId: request.id,
				method: request.method,
				url: request.url,
				statusCode: reply.statusCode,
				durationMs: Math.round(performance.now() - started),
			},
			"HTTP request completed",
		);
	});

	app.get("/healthz", async () => ({ ok: true }));
	app.get("/openapi.json", async () =>
		createOpenApiDocument({
			title: "D&D Character Manager API",
			version: "0.1.0",
			routes: apiRouteContracts,
		}),
	);
	const characterService = createCharacterService();
	const unregisterAccountLinkHandler = registerAnonymousAccountLinkHandler(
		async ({ anonymousUserId, linkedUserId }) => {
			await characterService.transferCharactersToUser(anonymousUserId, linkedUserId);
		},
	);
	await registerAuthRoutes(app);
	await registerCharacterCreationRoute(app);
	await registerCharacterDetailRoutes(app);
	await registerHealthRoutes(app);
	await registerCharacterRoutes(app, { characterService });
	await registerCharacterTreasuryRoutes(app);
	await registerCharacterItemRoutes(app);
	await registerCharacterHistoryRoutes(app);
	await registerCatalogueRoutes(app);

	if (options.staticRoot) {
		registerStaticAssetFallback(app, options.staticRoot);
	}

	app.addHook("onClose", async () => {
		unregisterAccountLinkHandler();
		await closeDb();
	});

	return app;
}
