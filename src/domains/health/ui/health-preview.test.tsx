import { MantineProvider } from "@mantine/core";
import { renderToString } from "react-dom/server";
import { expect, it } from "vitest";
import { HealthPreview } from "./health-preview.js";

it.each([
	{ preview: null, color: "green" as const, expected: "Enter an amount" },
	{ preview: 27, color: "green" as const, expected: "+9 HP" },
	{ preview: 0, color: "red" as const, expected: "-18 HP" },
])("shows an honest before/after snapshot for $preview", ({ preview, color, expected }) => {
	const html = renderToString(
		<MantineProvider>
			<HealthPreview
				health={{ currentHp: 18, maxHp: 24, temporaryHp: 3, effectiveMaxHp: 27 }}
				preview={preview}
				color={color}
			/>
		</MantineProvider>,
	).replaceAll("<!-- -->", "");
	expect(html).toContain(expected);
	expect(html).toContain("Now");
	expect(html).toContain("After");
	expect(html).toContain("Maximum includes 3 temp HP.");
	if (preview === 27) expect(html).toContain("Maximum HP reached.");
	if (preview === 0) expect(html).toContain("No HP remaining.");
});
