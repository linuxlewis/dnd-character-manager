import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActivityPaginationError } from "./character-activity-drawer.js";

describe("character activity drawer states", () => {
	it("offers a retry action after a partial page failure", () => {
		const html = renderToString(
			<MantineProvider>
				<ActivityPaginationError onRetry={vi.fn()} />
			</MantineProvider>,
		);

		expect(html).toContain("More activity unavailable");
		expect(html).toContain("Try loading more");
	});
});
