import { describe, expect, it } from "vitest";
import { theme } from "./theme.js";

describe("theme", () => {
	it("sets the app's dark-oriented focus colors", () => {
		expect(theme.primaryColor).toBe("bloodstone");
		expect(theme.colors?.bloodstone).toHaveLength(10);
		expect(theme.colors?.candle).toHaveLength(10);
		expect(theme.defaultRadius).toBe("sm");
	});

	it("keeps editable controls at mobile-safe sizing", () => {
		expect(theme.components?.TextInput?.defaultProps).toMatchObject({
			radius: "sm",
			size: "md",
		});
		expect(theme.components?.NumberInput?.defaultProps).toMatchObject({
			radius: "sm",
			size: "md",
		});
		expect(theme.components?.Select?.defaultProps).toMatchObject({
			radius: "sm",
			size: "md",
		});
	});
});
