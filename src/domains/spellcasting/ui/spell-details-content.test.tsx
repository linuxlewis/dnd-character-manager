import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { SpellDetailsContent } from "./spell-details-content.js";

it("shows full descriptions and higher-level effects without clipping", () => {
	const html = renderToString(
		<MantineProvider>
			<SpellDetailsContent
				details={{
					source: "spell",
					level: 1,
					metadata: [{ label: "Range", value: "120 feet" }],
					desc: ["First paragraph.", "Second paragraph."],
					higherLevel: ["An extra dart per slot level."],
				}}
			/>
		</MantineProvider>,
	);
	for (const text of [
		"120 feet",
		"First paragraph.",
		"Second paragraph.",
		"An extra dart per slot level.",
	])
		expect(html).toContain(text);
});
