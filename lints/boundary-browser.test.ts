import { describe, expect, it } from "vitest";
import { boundaryFixture } from "./boundary-fixture.js";

describe("browser closures and unsupported imports", () => {
	it.each([
		"ui/view.ts",
		"types/index.ts",
	])("rejects a hidden server dependency reached from %s", (entry) => {
		const findings = boundaryFixture({
			[`src/domains/health/${entry}`]: 'import "../config/index.js";',
			"src/domains/health/config/index.ts": 'export * from "./barrel.js";',
			"src/domains/health/config/barrel.ts": 'export * from "../service/index.js";',
			"src/domains/health/service/index.ts": "export {};",
		});
		const trace = findings.find(
			(finding) => finding.rule === "browser-closure" && finding.file.endsWith(entry),
		)?.trace;
		expect(trace?.map((edge) => edge.specifier)).toEqual([
			"../config/index.js",
			"./barrel.js",
			"../service/index.js",
		]);
	});

	it("checks generated clients and app entrypoints instead of exempting them", () => {
		const findings = boundaryFixture({
			"src/app/main.tsx": 'import "../generated/api-client.generated.js";',
			"src/generated/api-client.generated.ts": 'import "../domains/health/types/index.js";',
			"src/domains/health/types/index.ts": 'export * from "../repo/private.js";',
			"src/domains/health/repo/private.ts": "export {};",
		});
		expect(
			findings
				.filter((finding) => finding.rule === "browser-closure")
				.map((finding) => finding.file),
		).toEqual([
			"src/app/main.tsx",
			"src/domains/health/types/index.ts",
			"src/generated/api-client.generated.ts",
		]);
	});

	it("permits safe public client contracts, own calculations, assets, and browser providers", () => {
		expect(
			boundaryFixture({
				"src/app/main.tsx":
					'import "../domains/health/ui/index.js"; import "./theme.css"; const mode = import.meta.env.MODE;',
				"src/app/theme.css": "body {}",
				"src/domains/health/ui/index.ts":
					'import "../config/index.js"; import "../../characters/types/index.js"; import "../../../generated/api-client.generated.js";',
				"src/domains/health/config/index.ts": 'import "../types/index.js";',
				"src/domains/health/types/index.ts": 'import "zod";',
				"src/domains/characters/types/index.ts": "export {};",
				"src/generated/api-client.generated.ts": 'import "../providers/auth/current-user.js";',
				"src/providers/auth/current-user.ts": 'import "zod";',
			}),
		).toEqual([]);
	});

	it("permits the public browser navigation provider from app and domain UI", () => {
		expect(
			boundaryFixture({
				"src/app/main.tsx": 'import "../providers/navigation/index.js";',
				"src/domains/characters/ui/index.ts": 'import "../../../providers/navigation/index.js";',
				"src/providers/navigation/index.ts": 'export * from "./browser-navigation.js";',
				"src/providers/navigation/browser-navigation.ts":
					'import "react"; export const pathname = () => window.location.pathname;',
			}),
		).toEqual([]);
	});

	it("rejects a server dependency hidden behind the allowed navigation provider", () => {
		const findings = boundaryFixture({
			"src/app/main.tsx": 'import "../providers/navigation/index.js";',
			"src/providers/navigation/index.ts": 'export * from "./browser-navigation.js";',
			"src/providers/navigation/browser-navigation.ts": 'import "node:fs";',
		});
		expect(
			findings
				.find((finding) => finding.rule === "browser-closure")
				?.trace.map((edge) => edge.specifier),
		).toEqual(["../providers/navigation/index.js", "./browser-navigation.js", "node:fs"]);
	});

	it("does not exempt other files in the navigation provider directory", () => {
		const findings = boundaryFixture({
			"src/app/main.tsx": 'import "../providers/navigation/index.js";',
			"src/providers/navigation/index.ts": 'export * from "./other.js";',
			"src/providers/navigation/other.ts": "export {};",
		});
		expect(
			findings
				.find((finding) => finding.rule === "browser-closure")
				?.trace.map((edge) => edge.specifier),
		).toEqual(["../providers/navigation/index.js", "./other.js"]);
	});

	it("rejects mixed auth barrels even for type imports", () => {
		const findings = boundaryFixture({
			"src/app/main.tsx": 'import type { Session } from "../providers/auth/index.js";',
			"src/providers/auth/index.ts": 'export * from "./auth.js";',
			"src/providers/auth/auth.ts": 'import "better-auth";',
		});
		expect(findings.map((finding) => finding.rule)).toEqual([
			"browser-closure",
			"dependency-boundary",
		]);
		expect(findings[0].trace[0].typeOnly).toBe(true);
	});

	it.each([
		"node:fs",
		"fs",
		"postgres",
		"drizzle-orm/pg-core",
	])("rejects server package %s behind an allowed config barrel", (dependency) => {
		const findings = boundaryFixture({
			"src/domains/health/ui/view.ts": 'import "../config/index.js";',
			"src/domains/health/config/index.ts": `import "${dependency}";`,
		});
		expect(
			findings
				.find((finding) => finding.rule === "browser-closure")
				?.trace.map((edge) => edge.specifier),
		).toEqual(["../config/index.js", dependency]);
	});

	it("rejects server environment access reached through otherwise safe config", () => {
		const findings = boundaryFixture({
			"src/domains/health/ui/view.ts": 'import "../config/index.js";',
			"src/domains/health/config/index.ts": "export const token = process.env.SECRET;",
		});
		expect(findings).toEqual([
			expect.objectContaining({
				file: "src/domains/health/config/index.ts",
				rule: "browser-global",
				line: 1,
				trace: [expect.objectContaining({ specifier: "../config/index.js" })],
			}),
		]);
	});

	it("does not mistake property names or comments for server globals", () => {
		expect(
			boundaryFixture({
				"src/app/main.tsx":
					'// process.env is forbidden\nconst data = { process: "label" }; data.process;',
			}),
		).toEqual([]);
	});

	it("reports missing local modules and assets but permits installed package references", () => {
		const findings = boundaryFixture({
			"src/app/main.tsx":
				'import "./missing.js"; import "./missing.css"; import "@domains/missing/types"; import "react";',
		});
		expect(findings.map((finding) => finding.rule)).toEqual([
			"unresolved-import",
			"unresolved-import",
			"unresolved-import",
		]);
	});

	it("checks literal dynamic imports and rejects nonliteral targets and require", () => {
		const findings = boundaryFixture({
			"src/domains/health/ui/view.ts":
				'import("../service/index.js");\nimport(target);\nrequire("../service/index.js");\nrequire(target);',
			"src/domains/health/service/index.ts": "export {};",
		});
		expect(
			findings
				.filter((finding) => finding.rule !== "browser-closure")
				.map((finding) => [finding.rule, finding.line]),
		).toEqual([
			["dependency-boundary", 1],
			["nonliteral-import", 2],
			["unsupported-require", 3],
			["unsupported-require", 4],
		]);
	});

	it("does not let production code import test modules to bypass the rules", () => {
		const findings = boundaryFixture({
			"src/domains/health/types/index.ts": 'export * from "./escape.test.js";',
			"src/domains/health/types/escape.test.ts": 'export * from "../service/index.js";',
			"src/domains/health/service/index.ts": "export {};",
		});
		expect(findings.map((finding) => finding.rule)).toEqual([
			"browser-closure",
			"dependency-boundary",
		]);
	});

	it("keeps server-only environment config legal until a browser imports it", () => {
		expect(
			boundaryFixture({
				"src/domains/catalogue/config/server.ts": "export const token = process.env.TOKEN;",
				"src/domains/catalogue/repo/read.ts": 'import "../config/server.js";',
			}),
		).toEqual([]);
	});

	it("allows application contract metadata without allowing server routes into response types", () => {
		expect(
			boundaryFixture({
				"src/application/character-detail/contract.ts":
					'import type { Contract } from "../../providers/openapi/index.js"; import "./types/index.js";',
				"src/application/character-detail/types/index.ts": "export {};",
				"src/providers/openapi/index.ts": 'export type { Contract } from "./document.js";',
				"src/providers/openapi/document.ts": "export type Contract = unknown;",
			}),
		).toEqual([]);
	});
});
