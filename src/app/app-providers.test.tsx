import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppProviders } from "./app-providers.js";

describe("AppProviders", () => {
	it("renders children inside the app provider stack", () => {
		expect(
			renderToString(
				<AppProviders>
					<span>Child</span>
				</AppProviders>,
			),
		).toContain("Child");
	});
});
