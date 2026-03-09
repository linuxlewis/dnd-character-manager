import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("US-003: App layout integration", () => {
	const appSource = readFileSync(resolve(__dirname, "app.tsx"), "utf-8");

	it("App wraps content in ThemeProvider", () => {
		expect(appSource).toContain("<ThemeProvider>");
		expect(appSource).toContain("</ThemeProvider>");
	});

	it("App renders ThemeToggle in header", () => {
		expect(appSource).toContain("<ThemeToggle");
		expect(appSource).toContain("<header");
	});

	it("App uses Tailwind classes for layout", () => {
		expect(appSource).toContain("min-h-screen");
		expect(appSource).toContain("sticky");
		expect(appSource).toContain("bg-muted");
	});

	it("App uses theme CSS variables for background", () => {
		expect(appSource).toContain("var(--color-bg)");
	});

	it("App has transition classes", () => {
		expect(appSource).toContain("transition-colors");
	});

	it("header is sticky with z-index", () => {
		expect(appSource).toContain("sticky top-0 z-50");
	});

	it("main content has max width constraint", () => {
		expect(appSource).toContain("max-w-[960px]");
	});
});
