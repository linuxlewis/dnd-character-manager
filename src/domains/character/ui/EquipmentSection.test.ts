import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("EquipmentSection themed styles", () => {
	const cssPath = resolve(__dirname, "EquipmentSection.module.css");
	const css = readFileSync(cssPath, "utf-8");

	it("uses CSS custom properties for all colors", () => {
		// Should contain var() references
		expect(css).toContain("var(--color-text)");
		expect(css).toContain("var(--color-surface)");
		expect(css).toContain("var(--color-input-bg)");
		expect(css).toContain("var(--color-input-border)");
		expect(css).toContain("var(--color-success)");
		expect(css).toContain("var(--color-danger)");
	});

	it("has styled add button with theme tokens", () => {
		expect(css).toContain(".equipmentAddButton");
		expect(css).toContain("var(--color-success)");
	});

	it("has styled remove button with theme tokens", () => {
		expect(css).toContain(".equipmentRemove");
		expect(css).toContain("var(--color-danger)");
	});

	it("does not contain hardcoded hex color values", () => {
		const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
		const matches = css.match(hexPattern);
		expect(matches).toBeNull();
	});

	it("includes transition for theme switching", () => {
		expect(css).toContain("var(--transition-theme)");
	});

	it("has responsive styles for mobile", () => {
		expect(css).toContain("@media");
		expect(css).toContain("480px");
	});
});

describe("No hardcoded colors in any CSS module", () => {
	const { readdirSync } = require("node:fs");
	const { join } = require("node:path");

	function findCssModules(dir: string): string[] {
		const results: string[] = [];
		try {
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const fullPath = join(dir, entry.name);
				if (entry.isDirectory() && entry.name !== "node_modules") {
					results.push(...findCssModules(fullPath));
				} else if (entry.name.endsWith(".module.css")) {
					results.push(fullPath);
				}
			}
		} catch {}
		return results;
	}

	const srcDir = resolve(__dirname, "../../../");
	const cssFiles = findCssModules(srcDir);

	it("found CSS module files to check", () => {
		expect(cssFiles.length).toBeGreaterThan(0);
	});

	for (const file of cssFiles) {
		const relPath = file.replace(srcDir, "src");
		it(`${relPath} has no hardcoded hex colors`, () => {
			const content = readFileSync(file, "utf-8");
			const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
			const matches = content.match(hexPattern);
			expect(matches).toBeNull();
		});
	}
});

describe("Theme CSS has warning token", () => {
	const themeCss = readFileSync(resolve(__dirname, "../../../app/theme.css"), "utf-8");

	it("defines --color-warning in light theme", () => {
		expect(themeCss).toContain("--color-warning");
	});
});
