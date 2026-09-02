import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { InventoryCountsAlert } from "./inventory-counts-alert.js";

describe("InventoryCountsAlert", () => {
	it("explains that the list remains usable and exposes a retry action", () => {
		const html = renderToString(
			<MantineProvider>
				<InventoryCountsAlert onRetry={vi.fn()} />
			</MantineProvider>,
		);

		expect(html).toContain("Inventory counts unavailable");
		expect(html).toContain("Item cards remain available");
		expect(html).toContain('aria-label="Retry inventory counts"');
	});
});
