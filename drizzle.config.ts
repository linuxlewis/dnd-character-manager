import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./src/database/schema.ts",
	out: "./migrations/generated",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "postgres://app:localdev@localhost:5432/app",
	},
});
