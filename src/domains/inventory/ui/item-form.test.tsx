import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
	CreateCharacterItemRequest,
	UpdateCharacterItemRequest,
} from "../../../generated/api-client.generated.js";
import { ItemForm } from "./item-form.js";
import { isCurrentCatalogueRequest } from "./item-form-values.js";

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

	it("ignores a delayed failure from an older catalogue selection", async () => {
		let latestRequestId = 0;
		let selectedCatalogueId: string | null = null;
		let catalogueDetailError: Error | null = null;
		let appliedName = "";
		let rejectFirst!: (error: Error) => void;
		const firstDetails = new Promise<never>((_, reject) => {
			rejectFirst = reject;
		});

		const select = async (catalogueItemId: string, details: Promise<{ name: string }>) => {
			const requestId = ++latestRequestId;
			selectedCatalogueId = catalogueItemId;
			catalogueDetailError = null;
			try {
				const result = await details;
				if (!isCurrentCatalogueRequest(latestRequestId, requestId)) return;
				appliedName = result.name;
			} catch (error) {
				if (!isCurrentCatalogueRequest(latestRequestId, requestId)) return;
				selectedCatalogueId = null;
				catalogueDetailError = error instanceof Error ? error : new Error(String(error));
			}
		};

		const firstSelection = select("catalogue-a", firstDetails);
		await select("catalogue-b", Promise.resolve({ name: "Result B" }));
		expect(selectedCatalogueId).toBe("catalogue-b");
		expect(appliedName).toBe("Result B");

		rejectFirst(new Error("Result A failed"));
		await firstSelection;
		expect(selectedCatalogueId).toBe("catalogue-b");
		expect(catalogueDetailError).toBeNull();
		expect(appliedName).toBe("Result B");
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
