import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(resolve(__dirname, "globals.css"), "utf-8");

describe("globals.css", () => {
	it("contains :root selector", () => {
		expect(globalsCss).toContain(":root");
	});

	it('contains [data-theme="dark"] selector', () => {
		expect(globalsCss).toContain('[data-theme="dark"]');
	});

	const colorTokens = [
		"--color-bg",
		"--color-surface-raw",
		"--color-text-raw",
		"--color-text-secondary-raw",
		"--color-primary-raw",
		"--color-primary-hover",
		"--color-border-raw",
		"--color-danger-raw",
		"--color-success-raw",
		"--color-input-bg-raw",
		"--color-input-border-raw",
	];

	for (const token of colorTokens) {
		it(`defines color token ${token}`, () => {
			expect(globalsCss).toContain(token);
		});
	}

	const spacingTokens = ["--space-xs", "--space-sm", "--space-md", "--space-lg", "--space-xl"];

	for (const token of spacingTokens) {
		it(`defines spacing token ${token}`, () => {
			expect(globalsCss).toContain(token);
		});
	}

	it("imports tailwindcss", () => {
		expect(globalsCss).toContain('@import "tailwindcss"');
	});

	it("defines transition token --transition-theme", () => {
		expect(globalsCss).toContain("--transition-theme");
	});

	it("light theme has white/light background", () => {
		expect(globalsCss).toMatch(/--color-bg:\s*#fff/);
	});

	it("dark theme has dark background", () => {
		expect(globalsCss).toContain("#1a1a2e");
	});

	it("dark theme has light text", () => {
		expect(globalsCss).toContain("#e0e0e0");
	});
});

describe("main.tsx imports globals.css", () => {
	it("contains globals.css import", () => {
		const mainTSX = readFileSync(resolve(__dirname, "main.tsx"), "utf-8");
		expect(mainTSX).toContain('import "./globals.css"');
	});
});
