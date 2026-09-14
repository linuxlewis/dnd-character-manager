import { describe, expect, it } from "vitest";
import { boundaryFixture } from "./boundary-fixture.js";

describe("resolved domain boundaries", () => {
	it("allows public service forwarding of its own value contracts", () => {
		expect(
			boundaryFixture({
				"src/domains/health/service/index.ts": 'export * from "./operations.js";',
				"src/domains/health/service/operations.ts":
					'import type { Health } from "../types/index.js"; export type { Health };',
				"src/domains/health/types/index.ts": 'export type { Health } from "./health.js";',
				"src/domains/health/types/health.ts": "export type Health = number;",
			}),
		).toEqual([]);
	});

	it.each([
		'import privateRead from "../repo/private.js"; export default privateRead;',
		'import { privateRead } from "../repo/private.js"; export { privateRead };',
		'import { privateRead as read } from "../repo/private.js"; export { read as publicRead };',
		'import * as storage from "../repo/private.js"; export { storage };',
		'import type { Storage } from "../repo/private.js"; export type { Storage };',
	])("rejects imported private bindings forwarded through public exports", (forwarding) => {
		const findings = boundaryFixture({
			"src/domains/health/service/read.ts": 'import "../../characters/service/index.js";',
			"src/domains/characters/service/index.ts": forwarding,
			"src/domains/characters/repo/private.ts":
				"export const privateRead = () => 1; export type Storage = number;",
		});
		expect(findings).toEqual([expect.objectContaining({ rule: "private-reexport" })]);
	});

	it.each(["service", "types", "schema"])("nested %s index files are private", (layer) => {
		const findings = boundaryFixture({
			[`src/domains/health/${layer}/index.ts`]: `import "../../characters/${layer}/internal/index.js";`,
			[`src/domains/characters/${layer}/internal/index.ts`]: "export {};",
		});
		expect(findings).toEqual(
			expect.arrayContaining([expect.objectContaining({ rule: "dependency-boundary" })]),
		);
	});

	it("forbids private repository reexports through public service chains but allows implementation imports", () => {
		const files = {
			"src/domains/health/service/read.ts": 'import "../../characters/service/index.js";',
			"src/domains/characters/service/index.ts": 'export * from "./operations.js";',
			"src/domains/characters/service/operations.ts":
				'import "../repo/private.js"; export const read = () => 1;',
			"src/domains/characters/repo/private.ts": "export {};",
		};
		expect(boundaryFixture(files)).toEqual([]);
		const findings = boundaryFixture({
			...files,
			"src/domains/characters/service/operations.ts": 'export * from "../repo/private.js";',
		});
		expect(findings).toEqual([
			expect.objectContaining({
				rule: "private-reexport",
				trace: [
					expect.objectContaining({ specifier: "./operations.js" }),
					expect.objectContaining({ specifier: "../repo/private.js" }),
				],
			}),
		]);
	});

	it.each([
		"../service/value.js",
		"@domains/characters/service/value",
	])("rejects backward import %s with real source locations", (specifier) => {
		const findings = boundaryFixture({
			"src/domains/characters/types/value.ts": `\nimport { value } from "${specifier}";`,
			"src/domains/characters/service/value.ts": "export const value = 1;",
		});
		expect(findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					rule: "dependency-boundary",
					file: "src/domains/characters/types/value.ts",
					line: 2,
				}),
			]),
		);
		expect(findings[0].trace[0].target).toMatch(/characters\/service\/value.ts$/);
	});

	it.each([
		"import",
		"import type",
		"export type",
	])("rejects private foreign contracts for %s", (syntax) => {
		const findings = boundaryFixture({
			"src/domains/health/service/read.ts": `${syntax} { Value } from "../../characters/types/value.js";`,
			"src/domains/characters/types/value.ts": "export type Value = number;",
		});
		expect(findings.map((finding) => finding.rule)).toEqual(["dependency-boundary"]);
	});

	it("allows public service and type contracts, providers, and the narrow repository access boundary", () => {
		expect(
			boundaryFixture({
				"src/domains/health/service/read.ts":
					'import "../../characters/service/index.js"; import "../../characters/types/index.js"; import "../../../providers/telemetry/index.js";',
				"src/domains/health/repo/save.ts":
					'import "../../characters/access/index.js"; import "../../../providers/database/index.js";',
				"src/domains/characters/service/index.ts": "export {};",
				"src/domains/characters/types/index.ts": "export {};",
				"src/domains/characters/access/index.ts": 'export * from "./owned.js";',
				"src/domains/characters/access/owned.ts":
					'import "../schema/index.js"; import type { Connection } from "../../../providers/database/index.js";',
				"src/domains/characters/schema/index.ts": "export {};",
				"src/providers/database/index.ts": "export type Connection = unknown;",
				"src/providers/telemetry/index.ts": 'import "pino";',
			}),
		).toEqual([]);
	});

	it("does not extend the character access exception to services, foreign private access, or new access owners", () => {
		const findings = boundaryFixture({
			"src/domains/health/repo/read.ts": 'import "../../characters/access/private.js";',
			"src/domains/health/access/index.ts": "export {};",
			"src/domains/characters/access/private.ts": 'import "../service/index.js";',
			"src/domains/characters/service/index.ts": "export {};",
		});
		expect(findings.map((finding) => finding.rule)).toEqual([
			"dependency-boundary",
			"access-owner",
			"dependency-boundary",
		]);
	});

	it("allows declared FK edges and exactly the database-client registration exception", () => {
		expect(
			boundaryFixture({
				"src/domains/health/schema/index.ts": 'import "../../characters/schema/index.js";',
				"src/domains/spellcasting/schema/index.ts": 'import "../../characters/schema/index.js";',
				"src/domains/inventory/schema/index.ts":
					'import "../../characters/schema/index.js"; import "../../catalogue/schema/index.js"; import "../../../providers/auth/schema.js";',
				"src/domains/catalogue/schema/index.ts": "export {};",
				"src/domains/characters/schema/index.ts": 'import "../../../providers/auth/schema.js";',
				"src/providers/auth/schema.ts": 'import "drizzle-orm/pg-core";',
				"src/database/schema.ts":
					'export * from "../domains/health/schema/index.js"; export * from "../domains/inventory/schema/index.js";',
				"src/providers/database/client.ts":
					'import * as schema from "../../database/schema.js"; import "drizzle-orm/postgres-js";',
			}),
		).toEqual([]);
	});

	it("rejects unapproved FK edges and schema cycles deterministically", () => {
		const files = {
			"src/domains/characters/schema/index.ts": 'import "../../health/schema/index.js";',
			"src/domains/health/schema/index.ts": 'import "../../characters/schema/index.js";',
		};
		const findings = boundaryFixture(files);
		expect(findings.map((finding) => finding.rule)).toEqual([
			"dependency-boundary",
			"schema-type-cycle",
		]);
		expect(findings[1].trace.map((edge) => edge.specifier)).toEqual([
			"../../health/schema/index.js",
			"../../characters/schema/index.js",
		]);
		expect(boundaryFixture(files).map((finding) => finding.rule)).toEqual(
			findings.map((finding) => finding.rule),
		);
	});

	it.each([
		"client",
		"index",
	])("rejects schema-to-database %s through a barrel with a trace", (target) => {
		const findings = boundaryFixture({
			"src/domains/health/schema/index.ts": 'export * from "./tables.js";',
			"src/domains/health/schema/tables.ts": `import "../../../providers/database/${target}.js";`,
			[`src/providers/database/${target}.ts`]: "export {};",
		});
		const trace = findings.find(
			(finding) => finding.rule === "schema-closure" && finding.file.endsWith("index.ts"),
		)?.trace;
		expect(trace?.map((edge) => edge.specifier)).toEqual([
			"./tables.js",
			`../../../providers/database/${target}.js`,
		]);
	});

	it("rejects provider registry access except the exact initializer and rejects registry runtime closures", () => {
		const findings = boundaryFixture({
			"src/providers/database/other.ts": 'import "../../database/schema.js";',
			"src/database/schema.ts": 'export * from "../domains/health/schema/index.js";',
			"src/domains/health/schema/index.ts": 'export * from "../repo/private.js";',
			"src/domains/health/repo/private.ts": "export {};",
		});
		expect(findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					file: "src/providers/database/other.ts",
					rule: "dependency-boundary",
				}),
				expect.objectContaining({
					file: "src/database/schema.ts",
					rule: "schema-closure",
					trace: expect.arrayContaining([
						expect.objectContaining({ specifier: "../repo/private.js" }),
					]),
				}),
			]),
		);
	});

	it("permits application joins and workflows but forbids their private repository imports", () => {
		const files = {
			"src/application/character-detail/query.ts":
				'import "../../domains/health/schema/index.js"; import "../../domains/health/config/index.js"; import "../../providers/database/index.js"; import "./types/index.js";',
			"src/application/character-detail/workflow.ts":
				'import "../../domains/health/service/index.js"; import "./query.js";',
			"src/application/character-detail/types/index.ts":
				'export * from "../../../domains/health/types/index.js";',
			"src/domains/health/schema/index.ts": "export {};",
			"src/domains/health/config/index.ts": "export {};",
			"src/domains/health/types/index.ts": "export {};",
			"src/domains/health/service/index.ts": "export {};",
			"src/providers/database/index.ts": "export {};",
		};
		expect(boundaryFixture(files)).toEqual([]);
		expect(
			boundaryFixture({
				...files,
				"src/application/character-detail/query.ts":
					'import "../../domains/health/repo/private.js";',
				"src/domains/health/repo/private.ts": "export {};",
			}),
		).toEqual(expect.arrayContaining([expect.objectContaining({ rule: "dependency-boundary" })]));
	});

	it("rejects unknown application and domain roles instead of exempting them", () => {
		const findings = boundaryFixture({
			"src/application/feature/mystery.ts": "export {};",
			"src/domains/health/utils/helper.ts": "export {};",
		});
		expect(findings.map((finding) => finding.rule)).toEqual(["unknown-module", "unknown-module"]);
	});
});
