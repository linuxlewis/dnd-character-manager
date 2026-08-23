import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer.js";

describe("SiteFooter", () => {
	it("links to the privacy policy and identifies the free service", () => {
		const html = renderToString(
			<MantineProvider>
				<SiteFooter />
			</MantineProvider>,
		);

		expect(html).toContain('href="/privacy"');
		expect(html).toContain("Privacy Policy");
		expect(html).toContain("free community character management tool");
	});
});
