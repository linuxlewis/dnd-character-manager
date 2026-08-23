import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./app.js";
import { AppProviders } from "./app-providers.js";

function renderApp(pathname: string) {
	return renderToString(
		<AppProviders>
			<App pathname={pathname} />
		</AppProviders>,
	);
}

describe("App", () => {
	it("renders the application shell and footer", () => {
		const html = renderApp("/");

		expect(html).toContain("D&amp;D Character Manager");
		expect(html).toContain('href="/privacy"');
		expect(html).toContain("Privacy Policy");
	});

	it("renders the privacy policy route", () => {
		const html = renderApp("/privacy");

		expect(html).toContain("Information we collect");
		expect(html).toContain("transactional");
		expect(html).not.toContain("mailto:");
		expect(html).not.toContain("Starting session");
	});
});
