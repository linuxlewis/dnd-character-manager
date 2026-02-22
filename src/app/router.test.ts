import { describe, expect, it } from "vitest";
import { createRoute } from "./router.tsx";

describe("createRoute", () => {
	it("creates route matching exact path", () => {
		const route = createRoute("/", () => null);
		expect(route.pattern.test("/")).toBe(true);
		expect(route.pattern.test("/other")).toBe(false);
	});

	it("creates route with named parameter", () => {
		const route = createRoute("/character/:id", () => null);
		expect(route.pattern.test("/character/abc")).toBe(true);
		expect(route.pattern.test("/character/")).toBe(false);
		expect(route.pattern.test("/")).toBe(false);
	});

	it("extracts named parameters", () => {
		const route = createRoute("/character/:id", () => null);
		const match = "/character/abc-123".match(route.pattern);
		expect(match).not.toBeNull();
		expect(match?.groups?.id).toBe("abc-123");
	});

	it("handles multiple parameters", () => {
		const route = createRoute("/game/:gameId/character/:charId", () => null);
		const match = "/game/g1/character/c2".match(route.pattern);
		expect(match?.groups?.gameId).toBe("g1");
		expect(match?.groups?.charId).toBe("c2");
	});

	it("does not match partial paths", () => {
		const route = createRoute("/character/:id", () => null);
		expect(route.pattern.test("/character/abc/extra")).toBe(false);
	});
});
