import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const themeCSS = readFileSync(resolve(__dirname, "theme.css"), "utf-8");

describe("theme.css", () => {
	it("contains :root selector", () => {
		expect(themeCSS).toContain(":root");
	});

	it('contains [data-theme="dark"] selector', () => {
		expect(themeCSS).toContain('[data-theme="dark"]');
	});

	const colorTokens = [
		"--color-bg",
		"--color-surface",
		"--color-text",
		"--color-text-secondary",
		"--color-primary",
		"--color-primary-hover",
		"--color-border",
		"--color-danger",
		"--color-success",
		"--color-input-bg",
		"--color-input-border",
	];

	for (const token of colorTokens) {
		it(`defines color token ${token}`, () => {
			expect(themeCSS).toContain(token);
		});
	}

	const spacingTokens = ["--space-xs", "--space-sm", "--space-md", "--space-lg", "--space-xl"];

	for (const token of spacingTokens) {
		it(`defines spacing token ${token}`, () => {
			expect(themeCSS).toContain(token);
		});
	}

	const typographyTokens = [
		"--font-body",
		"--font-heading",
		"--font-mono",
		"--text-sm",
		"--text-base",
		"--text-lg",
		"--text-xl",
	];

	for (const token of typographyTokens) {
		it(`defines typography token ${token}`, () => {
			expect(themeCSS).toContain(token);
		});
	}

	it("defines transition token --transition-theme", () => {
		expect(themeCSS).toContain("--transition-theme");
	});

	it("light theme has white/light background", () => {
		// :root section should have light bg
		expect(themeCSS).toMatch(/--color-bg:\s*#fff/);
	});

	it("dark theme has dark background", () => {
		expect(themeCSS).toContain("#1a1a2e");
	});

	it("dark theme has light text", () => {
		expect(themeCSS).toContain("#e0e0e0");
	});
});

describe("main.tsx imports theme.css", () => {
	it("contains theme.css import", () => {
		const mainTSX = readFileSync(resolve(__dirname, "main.tsx"), "utf-8");
		expect(mainTSX).toContain('import "./theme.css"');
	});
});
