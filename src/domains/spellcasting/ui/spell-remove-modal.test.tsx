import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SpellRemoveModal } from "./spell-remove-modal.js";

describe("SpellRemoveModal", () => {
	it("renders confirmation copy for the selected spell", () => {
		const html = renderToString(
			<MantineProvider>
				<SpellRemoveModal
					onClose={vi.fn()}
					onConfirm={vi.fn()}
					pending={false}
					withinPortal={false}
					spell={{
						id: "00000000-0000-4000-8000-000000000030",
						slotLevel: 3,
						spellIndex: "magic-missile",
						name: "Magic Missile",
						level: 1,
						url: "/api/2014/spells/magic-missile",
						source: "spell",
					}}
				/>
			</MantineProvider>,
		);

		const readableHtml = html.replaceAll("<!-- -->", "");
		expect(readableHtml).toContain("Remove Magic Missile?");
		expect(readableHtml).toContain("This removes the spell from this character");
		expect(readableHtml).toContain("Cancel");
		expect(readableHtml).toContain("Remove spell");
	});
});
