import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PrivacyPolicy } from "./privacy-policy.js";

describe("PrivacyPolicy", () => {
	it("describes transactional email without publishing an email address", () => {
		const html = renderToString(
			<MantineProvider>
				<PrivacyPolicy />
			</MantineProvider>,
		);

		expect(html).toContain("Information we collect");
		expect(html).toContain("transactional");
		expect(html).not.toContain("mailto:");
	});
});
