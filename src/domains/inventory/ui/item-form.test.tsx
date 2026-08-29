import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
	CreateCharacterItemRequest,
	UpdateCharacterItemRequest,
} from "../../../generated/api-client.generated.js";
import { ItemForm } from "./item-form.js";

describe("ItemForm", () => {
	it("keeps manual entry fields available in the create flow", () => {
		const html = renderForm();
		expect(html).toContain("Local SRD catalogue");
		expect(html).toContain('aria-label="Search SRD catalogue"');
		expect(html).toContain(">Name");
		expect(html).toContain(">Category");
		expect(html).toContain(">Quantity");
		expect(html).toContain(">Notes");
		expect(html).toContain("Add item");
		expect(html).toContain("Cancel");
	});
});

function renderForm() {
	const client = new QueryClient();
	const onSubmit =
		vi.fn<(request: CreateCharacterItemRequest | UpdateCharacterItemRequest) => void>();
	return renderToString(
		<MantineProvider>
			<QueryClientProvider client={client}>
				<ItemForm
					error={null}
					mode="create"
					onClose={vi.fn()}
					onSubmit={onSubmit}
					opened
					pending={false}
				/>
			</QueryClientProvider>
		</MantineProvider>,
	);
}
