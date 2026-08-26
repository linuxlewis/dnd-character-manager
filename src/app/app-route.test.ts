import { describe, expect, it } from "vitest";
import { parseAppRoute } from "./app-route.js";

describe("parseAppRoute", () => {
	it("recognizes the privacy policy route", () => {
		expect(parseAppRoute("/privacy")).toEqual({ screen: "privacy" });
		expect(parseAppRoute("/privacy/")).toEqual({ screen: "privacy" });
	});

	it("leaves other paths to the character workspace", () => {
		expect(parseAppRoute("/")).toEqual({ screen: "characters" });
		expect(parseAppRoute("/characters/abc")).toEqual({ screen: "characters" });
	});
});
