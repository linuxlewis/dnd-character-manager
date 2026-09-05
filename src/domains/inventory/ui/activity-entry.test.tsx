import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FormattedActivityEntryView } from "./activity-entry.js";

describe("activity entry", () => {
	it("exposes relative and full timestamp text", () => {
		const html = renderToString(
			<MantineProvider>
				<FormattedActivityEntryView
					createdAt={new Date().toISOString()}
					entry={{
						accessibleDetail: "Balance: 2 gold pieces -> 5 gold pieces",
						accessibleSummary: "Spent 15 gold pieces",
						detail: "Balance: 2 GP -> 5 GP",
						icon: "coins",
						itemType: null,
						note: "Bought climbing gear",
						summary: "Spent 15 GP",
						tone: "treasury",
						valueTone: "negative",
					}}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Spent 15 GP");
		expect(html).toContain("Recorded");
	});
});
