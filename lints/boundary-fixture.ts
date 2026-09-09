import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { checkBoundaries } from "./boundary-policy.js";
import { buildImportGraph } from "./import-graph.js";

export function boundaryFixture(files: Record<string, string>) {
	const root = mkdtempSync(join(tmpdir(), "boundary-policy-"));
	try {
		for (const [file, content] of Object.entries({
			"tsconfig.json": JSON.stringify({
				compilerOptions: {
					module: "ESNext",
					moduleResolution: "bundler",
					paths: { "@domains/*": ["./src/domains/*"] },
				},
				include: ["src/**/*.ts", "src/**/*.tsx"],
			}),
			...files,
		})) {
			const path = join(root, file);
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, content);
		}
		return checkBoundaries(root, buildImportGraph(root));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}
