/**
 * Server entry point.
 *
 * Boots Fastify, registers domain routes, and starts listening.
 * Each domain's runtime layer exports a route registration function.
 */

import { getDb, migrate } from "@providers/db/index.js";
import { createLogger } from "@providers/telemetry/index.js";
import Fastify from "fastify";
import { registerCharacterRoutes } from "./domains/character/runtime/routes.js";
import { registerItemRoutes } from "./domains/example/runtime/routes.js";
import { registerSpellRoutes } from "./domains/spell/runtime/routes.js";

const log = createLogger("server");

// Initialize database and run migrations before starting
const db = getDb();
migrate(db);
log.info("Database migrations applied");

const app = Fastify({ logger: false });

// Register domain routes
await registerItemRoutes(app);
await registerCharacterRoutes(app);
await registerSpellRoutes(app);

// Start
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

app.listen({ port, host }, (err, address) => {
	if (err) {
		log.error({ err }, "Failed to start server");
		process.exit(1);
	}
	log.info({ address }, "Server started");
});
