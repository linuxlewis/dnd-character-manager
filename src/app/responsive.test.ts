import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("US-007: Responsive setup and mobile navigation", () => {
	const indexHtml = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
	const globalsCss = fs.readFileSync(path.resolve(__dirname, "globals.css"), "utf-8");

	it("index.html contains viewport meta tag with width=device-width", () => {
		expect(indexHtml).toContain('name="viewport"');
		expect(indexHtml).toContain("width=device-width");
	});

	it("CSS reset applies box-sizing: border-box globally", () => {
		expect(globalsCss).toContain("box-sizing: border-box");
	});

	it("CSS reset includes margin reset", () => {
		expect(globalsCss).toMatch(/\*\s*\{[^}]*margin:\s*0/);
	});

	it("CSS reset includes font smoothing", () => {
		expect(globalsCss).toContain("-webkit-font-smoothing: antialiased");
		expect(globalsCss).toContain("-moz-osx-font-smoothing: grayscale");
	});

	it("interactive elements have minimum 44px touch targets", () => {
		expect(globalsCss).toContain("min-height: 44px");
		expect(globalsCss).toContain("min-width: 44px");
	});

	it("App uses Tailwind responsive prefixes for mobile", () => {
		const appSource = fs.readFileSync(path.resolve(__dirname, "app.tsx"), "utf-8");
		expect(appSource).toContain("max-sm:");
	});
});
