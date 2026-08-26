import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CharacterEditor } from "./character-editor.js";

describe("CharacterEditor", () => {
	it("renders a single character edit affordance", () => {
		const queryClient = new QueryClient();
		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterEditor
						characterId="00000000-0000-4000-8000-000000000000"
						experiencePoints={27_000}
						level={7}
						name="Mira"
					/>
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).toContain("Edit character");
		expect(html).not.toContain("Edit name");
		expect(html).not.toContain("Edit level");
	});
});
