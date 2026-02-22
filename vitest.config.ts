import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
		setupFiles: ["src/test-setup.ts"],
	},
	resolve: {
		alias: {
			"@domains": resolve(__dirname, "src/domains"),
			"@providers": resolve(__dirname, "src/providers"),
		},
	},
});
