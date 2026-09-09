import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppProviders } from "./app-providers.js";
import { ApplicationMenu } from "./application-menu.js";

describe("ApplicationMenu", () => {
	it("keeps the application menu reachable before a session loads", () => {
		const html = renderToString(
			<AppProviders>
				<ApplicationMenu currentUser={null} />
			</AppProviders>,
		);
		expect(html).toContain('aria-label="Open account menu"');
		expect(html).toContain('aria-haspopup="menu"');
	});
});
