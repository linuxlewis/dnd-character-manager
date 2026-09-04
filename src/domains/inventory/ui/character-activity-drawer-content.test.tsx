import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActivityEmpty, ActivityPaginationError } from "./character-activity-drawer-content.js";

describe("character activity drawer content", () => {
	it("renders filter empty guidance and retry content", () => {
		const html = renderToString(
			<MantineProvider>
				<ActivityEmpty filter="items" onShowAll={vi.fn()} />
				<ActivityPaginationError onRetry={vi.fn()} />
			</MantineProvider>,
		);

		expect(html).toContain("No item activity");
		expect(html).toContain("Show all activity");
		expect(html).toContain("More activity unavailable");
		expect(html).toContain("Try loading more");
	});
});
