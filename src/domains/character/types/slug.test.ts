import { describe, expect, it } from "vitest";
import { generateSlug } from "./slug.js";

describe("generateSlug", () => {
	it("generates slug from name with random suffix", () => {
		const slug = generateSlug("Gandalf the Grey");
		expect(slug).toMatch(/^gandalf-the-grey-[a-f0-9]{4}$/);
	});

	it("handles special characters", () => {
		const slug = generateSlug("Drizzt Do'Urden!");
		expect(slug).toMatch(/^drizzt-dourden-[a-f0-9]{4}$/);
	});

	it("handles leading/trailing spaces", () => {
		const slug = generateSlug("  Gandalf  ");
		expect(slug).toMatch(/^gandalf-[a-f0-9]{4}$/);
	});

	it("handles multiple spaces", () => {
		const slug = generateSlug("Gandalf   the   Grey");
		expect(slug).toMatch(/^gandalf-the-grey-[a-f0-9]{4}$/);
	});

	it("produces different slugs on repeated calls", () => {
		const slugs = new Set(Array.from({ length: 10 }, () => generateSlug("Test")));
		expect(slugs.size).toBeGreaterThan(1);
	});
});
