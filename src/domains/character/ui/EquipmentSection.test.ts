import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("EquipmentSection uses shadcn/ui components", () => {
	const source = readFileSync(resolve(__dirname, "EquipmentSection.tsx"), "utf-8");
	const formSource = readFileSync(resolve(__dirname, "AddEquipmentForm.tsx"), "utf-8");

	it("imports Button component from shadcn/ui", () => {
		expect(source).toContain('from "../../../app/components/ui/button.tsx"');
	});

	it("imports Input component from shadcn/ui in form", () => {
		expect(formSource).toContain('from "../../../app/components/ui/input.tsx"');
	});

	it("uses Tailwind classes for styling", () => {
		expect(source).toContain("className=");
		expect(source).toContain("flex");
		expect(source).toContain("bg-muted");
	});

	it("does not import CSS modules", () => {
		expect(source).not.toContain(".module.css");
	});

	it("has responsive mobile styles in form", () => {
		expect(formSource).toContain("max-sm:");
	});

	it("imports Progress component for carrying capacity", () => {
		expect(source).toContain('from "../../../app/components/ui/progress.tsx"');
	});

	it("imports Select component in form for categories", () => {
		expect(formSource).toContain('from "../../../app/components/ui/select.tsx"');
	});

	it("hides Type and Weight columns on mobile to prevent overflow", () => {
		const typeHidden = (source.match(/max-sm:hidden/g) || []).length;
		expect(typeHidden).toBeGreaterThanOrEqual(4);
	});

	it("uses responsive grid columns for equipment table", () => {
		expect(source).toContain("grid-cols-[1fr_auto_auto]");
		expect(source).toContain("sm:grid-cols-[1fr_auto_auto_auto_auto]");
	});
});

describe("globals.css has design tokens", () => {
	const globalsCss = readFileSync(resolve(__dirname, "../../../app/globals.css"), "utf-8");

	it("defines color tokens for theming", () => {
		expect(globalsCss).toContain("--color-success");
		expect(globalsCss).toContain("--color-warning");
	});

	it("imports tailwindcss", () => {
		expect(globalsCss).toContain('@import "tailwindcss"');
	});

	it("does not set min-width on touch targets to avoid mobile overflow", () => {
		expect(globalsCss).not.toContain("min-width: 44px");
	});
});

describe("ShareSection avoids mobile overflow", () => {
	const shareSource = readFileSync(resolve(__dirname, "ShareSection.tsx"), "utf-8");

	it("uses flex truncation without a fixed max-width on the code element", () => {
		expect(shareSource).toContain("min-w-0");
		expect(shareSource).toContain("overflow-hidden");
		expect(shareSource).toContain("text-ellipsis");
		expect(shareSource).not.toContain("max-w-[200px]");
	});
});
