import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellSlotPanelDialogs } from "./spell-slot-panel-dialogs.js";

describe("SpellSlotPanelDialogs", () => {
	it("passes independent search recovery state to the search dialog", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellSlotPanelDialogs
					actionError={null}
					details={null}
					detailsError={null}
					detailsOpened={false}
					detailsPending={false}
					onChangeQuery={vi.fn()}
					onCloseDetails={vi.fn()}
					onCloseRemove={vi.fn()}
					onCloseSearch={vi.fn()}
					onRemove={vi.fn()}
					onRetryDetails={vi.fn()}
					onRetrySearch={vi.fn()}
					onSave={vi.fn()}
					removeError={null}
					removePending={false}
					searchError={new Error("Search failed.")}
					searchPending={false}
					searchResults={[]}
					searchState={{ query: "light", slotLevel: 0 }}
					searched
					spellToRemove={null}
					withinPortal={false}
				/>
			</MantineProvider>,
		);

		expect(html).toContain("Spell search unavailable");
		expect(html).toContain("Retry search");
	});
});
