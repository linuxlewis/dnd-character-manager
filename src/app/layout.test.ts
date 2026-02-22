import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("US-003: App layout integration", () => {
	const appSource = readFileSync(resolve(__dirname, "app.tsx"), "utf-8");
	const layoutCss = readFileSync(resolve(__dirname, "layout.module.css"), "utf-8");

	it("App wraps content in ThemeProvider", () => {
		expect(appSource).toContain("<ThemeProvider>");
		expect(appSource).toContain("</ThemeProvider>");
	});

	it("App renders ThemeToggle in header", () => {
		expect(appSource).toContain("<ThemeToggle");
		expect(appSource).toContain("<header");
	});

	it("App uses layout module styles", () => {
		expect(appSource).toContain("styles.appShell");
		expect(appSource).toContain("styles.header");
	});

	it("layout CSS uses theme custom properties for background and color", () => {
		expect(layoutCss).toContain("var(--color-bg)");
		expect(layoutCss).toContain("var(--color-text)");
	});

	it("layout CSS has transition using --transition-theme", () => {
		expect(layoutCss).toContain("var(--transition-theme");
		expect(layoutCss).toContain("background-color");
	});

	it("header is sticky", () => {
		expect(layoutCss).toContain("position: sticky");
		expect(layoutCss).toContain("top: 0");
	});

	it("layout has min-height 100vh", () => {
		expect(layoutCss).toContain("min-height: 100vh");
	});
});
