import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/providers/db/schema.ts",
	out: "./drizzle",
	dialect: "sqlite",
	dbCredentials: {
		url: "./data/app.db",
	},
});
