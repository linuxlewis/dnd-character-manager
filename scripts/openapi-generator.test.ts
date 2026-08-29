import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apiRouteContracts } from "../src/api-contracts.js";
import { createGeneratedOutputs, writeGeneratedOutputs } from "./openapi-generator.js";

describe("openapi generator", () => {
	it("creates deterministic, size-bounded generated artifacts", () => {
		const root = process.cwd();
		const first = createGeneratedOutputs(apiRouteContracts, root);
		const second = createGeneratedOutputs(apiRouteContracts, root);

		expect(second).toEqual(first);
		expect(first.map((output) => output.relativePath)).toContain(
			"src/generated/api-client.generated.ts",
		);
		expect(
			first
				.filter((output) => output.relativePath.endsWith(".ts"))
				.every((output) => output.content.split("\n").length < 300),
		).toBe(true);
	}, 15_000);

	it("detects missing and unexpected generated artifacts", () => {
		const root = mkdtempSync(join(tmpdir(), "openapi-generator-"));
		const output = {
			relativePath: "src/generated/example.generated.ts",
			content: "export const example = true;\n",
		};
		const generatedPath = join(root, output.relativePath);
		const unexpectedPath = join(root, "src/generated/unexpected.generated.ts");

		try {
			writeGeneratedOutputs([output], root, false);
			expect(readFileSync(generatedPath, "utf8")).toBe(output.content);
			expect(() => writeGeneratedOutputs([output], root, true)).not.toThrow();

			writeFileSync(unexpectedPath, "export const unexpected = true;\n");
			expect(() => writeGeneratedOutputs([output], root, true)).toThrow(
				"Unexpected generated files",
			);
			unlinkSync(unexpectedPath);

			unlinkSync(generatedPath);
			expect(() => writeGeneratedOutputs([output], root, true)).toThrow("Missing generated files");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
