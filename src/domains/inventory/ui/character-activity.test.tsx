import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { CharacterHistoryEntry } from "../types/index.js";
import { ActivityPreview } from "./character-activity.js";
import { ActivityPaginationError, CharacterActivityDrawer } from "./character-activity-drawer.js";

const characterId = "00000000-0000-4000-8000-000000000041";

describe("personal activity UI", () => {
	it("renders the one-entry preview states with an accessible surface", () => {
		const loading = renderPreview({ data: undefined, error: null, isLoading: true });
		const empty = renderPreview({ data: page([]), error: null, isLoading: false });
		const ready = renderPreview({
			data: page([entry("Added Rope")]),
			error: null,
			isLoading: false,
		});
		const error = renderPreview({ data: undefined, error: new Error("offline"), isLoading: false });

		expect(loading).toContain("Recent activity");
		expect(empty).toContain("No activity yet");
		expect(empty).toContain("Changes to items and treasury will appear here.");
		expect(ready).toContain("Added Rope");
		expect(ready).toContain("View inventory activity");
		expect(error).toContain("Activity unavailable");
		expect(error).toContain("Retry activity");
	});

	it("renders drawer title, character context, filters, date group, and load more", () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(
			apiQueryKeys.listCharacterHistory({ characterId }, { limit: 20, offset: 0 }),
			page([entry("Added Rope")], true),
		);
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterActivityDrawer
						characterId={characterId}
						characterName="Mira"
						onClose={vi.fn()}
						opened
						withinPortal={false}
					/>
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).toContain("Inventory activity");
		expect(html).toContain("Mira");
		expect(html).toContain("All");
		expect(html).toContain("Items");
		expect(html).toContain("Treasury");
		expect(html).toContain("Today");
		expect(html).toContain("Load more activity");
	});

	it("keeps the pagination retry action separate from the loaded ledger", () => {
		const html = renderToString(
			<MantineProvider>
				<ActivityPaginationError onRetry={vi.fn()} />
			</MantineProvider>,
		);

		expect(html).toContain("More activity unavailable");
		expect(html).toContain("Try loading more");
	});
});

function renderPreview(query: {
	data: ReturnType<typeof page> | undefined;
	error: Error | null;
	isLoading: boolean;
}) {
	return renderToString(
		<MantineProvider>
			<ActivityPreview onOpen={vi.fn()} query={{ ...query, refetch: vi.fn() }} />
		</MantineProvider>,
	);
}

function page(entries: CharacterHistoryEntry[], hasMore = false) {
	return { entries, total: entries.length + (hasMore ? 1 : 0), limit: 20, offset: 0, hasMore };
}

function entry(summary: string): CharacterHistoryEntry {
	return {
		id: `00000000-0000-4000-8000-${summary === "Added Rope" ? "000000000042" : "000000000043"}`,
		entityId: "00000000-0000-4000-8000-000000000044",
		entityName: "Rope",
		entityType: "item",
		action: "item_added",
		actorUserId: null,
		createdAt: new Date().toISOString(),
		details: {
			version: 1,
			item: {
				id: "00000000-0000-4000-8000-000000000044",
				name: summary.replace("Added ", ""),
				type: "misc",
				category: "Gear",
				rarity: null,
				quantity: 1,
				weight: null,
				estimatedValue: null,
				isEquipped: false,
			},
		},
	} as CharacterHistoryEntry;
}
