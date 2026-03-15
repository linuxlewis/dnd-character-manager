/**
 * Server entry point.
 *
 * Boots Fastify, registers domain routes, and starts listening.
 * Each domain's runtime layer exports a route registration function.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import fastifyStatic from "@fastify/static";
import { DB_PATH, getDb, migrate } from "@providers/db/index.js";
import { createLogger } from "@providers/telemetry/index.js";
import Fastify from "fastify";
import { registerCharacterRoutes } from "./domains/character/runtime/routes.js";
import { registerItemRoutes } from "./domains/example/runtime/routes.js";

const log = createLogger("server");

// Initialize database and run migrations before starting
log.info({ dbPath: DB_PATH }, "Using SQLite database");
const db = getDb();
migrate(db);
log.info({ dbPath: DB_PATH }, "Database migrations applied");

const app = Fastify({ logger: false });

// Health check endpoint
app.get("/health", async () => ({ status: "ok" }));
app.get("/api/debug/persistence", async () => ({
	databasePath: DB_PATH,
	nodeEnv: process.env.NODE_ENV ?? "development",
}));

// Register domain routes
await registerItemRoutes(app);
await registerCharacterRoutes(app);

// Serve static frontend in production
const staticDir = join(import.meta.dirname, "..", "dist", "app");
if (existsSync(staticDir)) {
	await app.register(fastifyStatic, { root: staticDir, wildcard: false });

	// SPA fallback: serve index.html for non-API routes
	app.setNotFoundHandler((request, reply) => {
		if (request.url.startsWith("/api/")) {
			reply.status(404).send({ error: "Not found" });
			return;
		}
		reply.sendFile("index.html");
	});

	log.info({ staticDir }, "Serving static frontend");
}

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
