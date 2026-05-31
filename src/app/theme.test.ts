import { describe, expect, it } from "vitest";
import { theme } from "./theme.js";

describe("theme", () => {
	it("sets the app's dark-oriented focus colors", () => {
		expect(theme.primaryColor).toBe("bloodstone");
		expect(theme.colors?.bloodstone).toHaveLength(10);
		expect(theme.colors?.candle).toHaveLength(10);
		expect(theme.defaultRadius).toBe("sm");
	});
});
