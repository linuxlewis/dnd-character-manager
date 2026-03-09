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

	const semanticTokens = [
		"--background",
		"--foreground",
		"--card",
		"--card-foreground",
		"--primary",
		"--primary-foreground",
		"--muted",
		"--muted-foreground",
		"--destructive",
		"--destructive-foreground",
		"--success",
		"--success-foreground",
		"--warning",
		"--warning-foreground",
		"--border",
		"--input",
		"--input-bg",
		"--ring",
	];

	for (const token of semanticTokens) {
		it(`defines semantic token ${token}`, () => {
			expect(globalsCss).toContain(token);
		});
	}

	const fantasyTokens = ["--parchment", "--gold", "--blood", "--arcane", "--nature", "--steel"];

	for (const token of fantasyTokens) {
		it(`defines D&D fantasy token ${token}`, () => {
			expect(globalsCss).toContain(token);
		});
	}

	it("imports tailwindcss", () => {
		expect(globalsCss).toContain('@import "tailwindcss"');
	});

	it("defines radius tokens", () => {
		expect(globalsCss).toContain("--radius");
	});

	it("light theme defines background as white", () => {
		expect(globalsCss).toMatch(/--background:\s*0 0% 100%/);
	});

	it("dark theme defines dark background", () => {
		expect(globalsCss).toMatch(/--background:\s*240 33% 14%/);
	});

	it("dark theme defines light foreground", () => {
		expect(globalsCss).toMatch(/--foreground:\s*0 0% 88%/);
	});
});

describe("main.tsx imports globals.css", () => {
	it("contains globals.css import", () => {
		const mainTSX = readFileSync(resolve(__dirname, "main.tsx"), "utf-8");
		expect(mainTSX).toContain('import "./globals.css"');
	});
});
