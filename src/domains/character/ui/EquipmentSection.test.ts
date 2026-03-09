import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("EquipmentSection uses shadcn/ui components", () => {
	const source = readFileSync(resolve(__dirname, "EquipmentSection.tsx"), "utf-8");

	it("imports Button component from shadcn/ui", () => {
		expect(source).toContain('from "../../../app/components/ui/button.tsx"');
	});

	it("imports Input component from shadcn/ui", () => {
		expect(source).toContain('from "../../../app/components/ui/input.tsx"');
	});

	it("uses Tailwind classes for styling", () => {
		expect(source).toContain("className=");
		expect(source).toContain("flex");
		expect(source).toContain("bg-muted");
	});

	it("does not import CSS modules", () => {
		expect(source).not.toContain(".module.css");
	});

	it("has responsive mobile styles", () => {
		expect(source).toContain("max-sm:");
	});
});

describe("globals.css has design tokens", () => {
	const globalsCss = readFileSync(resolve(__dirname, "../../../app/globals.css"), "utf-8");

	it("defines color tokens for theming", () => {
		expect(globalsCss).toContain("--color-success-raw");
		expect(globalsCss).toContain("--color-danger-raw");
		expect(globalsCss).toContain("--color-warning-raw");
	});

	it("imports tailwindcss", () => {
		expect(globalsCss).toContain('@import "tailwindcss"');
	});
});
