import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppProviders } from "./app-providers.js";
import { HomePage } from "./home-page.js";

describe("HomePage", () => {
	it("explains the current product and leads into the character workspace", () => {
		const html = renderToString(
			<AppProviders>
				<HomePage />
			</AppProviders>,
		);

		expect(html).toContain("Stay in the story. Your character is ready.");
		expect(html).toContain("Your moment to shine");
		expect(html).toContain("The story you carry");
		expect(html).toContain('href="/characters"');
		expect(html).toContain('href="/characters/new"');
	});
});
