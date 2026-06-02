import { describe, expect, it } from "vitest";
import {
	characterRoutePath,
	parseCharacterRoute,
	shouldHandleCharacterLink,
} from "./character-route.js";

describe("parseCharacterRoute", () => {
	it("parses list, create, and detail routes", () => {
		expect(parseCharacterRoute("/")).toEqual({ screen: "list" });
		expect(parseCharacterRoute("/characters")).toEqual({ screen: "list" });
		expect(parseCharacterRoute("/characters/new")).toEqual({ screen: "create" });
		expect(parseCharacterRoute("/characters/abc")).toEqual({ screen: "detail", id: "abc" });
	});

	it("falls back to the list for unknown routes", () => {
		expect(parseCharacterRoute("/missing")).toEqual({ screen: "list" });
	});

	it("falls back to the list for malformed detail route URI components", () => {
		expect(parseCharacterRoute("/characters/%test")).toEqual({ screen: "list" });
	});
});

describe("characterRoutePath", () => {
	it("builds browser paths from app routes", () => {
		expect(characterRoutePath({ screen: "list" })).toBe("/characters");
		expect(characterRoutePath({ screen: "create" })).toBe("/characters/new");
		expect(characterRoutePath({ screen: "detail", id: "a b" })).toBe("/characters/a%20b");
	});
});

describe("shouldHandleCharacterLink", () => {
	it("handles ordinary left-click links inside the app", () => {
		expect(
			shouldHandleCharacterLink({
				altKey: false,
				button: 0,
				ctrlKey: false,
				defaultPrevented: false,
				metaKey: false,
				shiftKey: false,
			}),
		).toBe(true);
	});

	it("leaves modified clicks to the browser", () => {
		expect(
			shouldHandleCharacterLink({
				altKey: false,
				button: 0,
				ctrlKey: true,
				defaultPrevented: false,
				metaKey: false,
				shiftKey: false,
			}),
		).toBe(false);
	});
});
