import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import type {
	CatalogueItemSearchResponse,
	CatalogueItemSearchResult,
	CatalogueStatusResponse,
} from "../../catalogue/types/index.js";
import { CatalogueItemSearch } from "./catalogue-item-search.js";

const searchQuery = { q: "", limit: 20 };

describe("CatalogueItemSearch", () => {
	it("renders combined mundane and magic results with rules provenance", () => {
		const client = new QueryClient();
		client.setQueryData(apiQueryKeys.getCatalogueStatus(), readyStatus());
		client.setQueryData(apiQueryKeys.searchCatalogueItems(searchQuery), {
			readiness: "ready",
			items: [
				catalogueItem("Silvered Blade", "weapon", false),
				catalogueItem("Moonblade", "magic-item", true),
			],
			total: 2,
		} satisfies CatalogueItemSearchResponse);

		const html = renderSearch(client).replaceAll("<!-- -->", "");
		expect(html).toContain("Search SRD catalogue");
		expect(html).toContain("Rules 2024");
		expect(html).toContain("Silvered Blade");
		expect(html).toContain("Moonblade");
		expect(html).toContain("Mundane");
		expect(html).toContain("Magic item");
	});

	it("keeps manual entry available when the local catalogue is not seeded", () => {
		const client = new QueryClient();
		client.setQueryData(apiQueryKeys.getCatalogueStatus(), unavailableStatus());

		const html = renderSearch(client);
		expect(html).toContain("SRD catalogue not seeded");
		expect(html).toContain("Manual item entry remains available");
		expect(html).toContain('aria-label="Search SRD catalogue"');
	});
});

function renderSearch(client: QueryClient) {
	return renderToString(
		<MantineProvider>
			<QueryClientProvider client={client}>
				<CatalogueItemSearch
					detailError={null}
					detailPendingId={null}
					onSelect={() => undefined}
					opened
					selectedCatalogueId={null}
				/>
			</QueryClientProvider>
		</MantineProvider>,
	);
}

function readyStatus(): CatalogueStatusResponse {
	return {
		source: {
			name: "foundry-dnd5e",
			sourceRevision: "0123456789abcdef0123456789abcdef01234567",
			rulesVersion: "2024",
			sourceUrl: "https://github.com/foundryvtt/dnd5e",
			attribution: "Foundry D&D 5e SRD",
		},
		capabilities: [],
		items: {
			capability: "items",
			pack: "equipment24",
			readiness: "ready",
			seeded: true,
			count: 2,
			sourceRevision: "0123456789abcdef0123456789abcdef01234567",
			audit: null,
		},
	};
}

function unavailableStatus(): CatalogueStatusResponse {
	return {
		...readyStatus(),
		items: {
			...readyStatus().items,
			readiness: "unavailable",
			seeded: false,
			count: 0,
			sourceRevision: null,
		},
	};
}

function catalogueItem(name: string, kind: CatalogueItemSearchResult["kind"], isMagical: boolean) {
	return {
		id: isMagical ? "00000000-0000-4000-8000-000000000052" : "00000000-0000-4000-8000-000000000051",
		source: "foundry-dnd5e" as const,
		sourceKey: name.toLowerCase().replaceAll(" ", "-"),
		sourcePath: `packs/_source/equipment24/${name.toLowerCase().replaceAll(" ", "-")}.yml`,
		rulesVersion: "2024" as const,
		license: "CC-BY-4.0",
		sourcePayload: {},
		sourceRevision: "0123456789abcdef0123456789abcdef01234567",
		sourceUrl:
			"https://raw.githubusercontent.com/foundryvtt/dnd5e/0123456789abcdef0123456789abcdef01234567/item.yml",
		capability: "equipment" as const,
		pack: "equipment24" as const,
		seedMetadata: {},
		identifier: name.toLowerCase().replaceAll(" ", "-"),
		name,
		kind,
		category: isMagical ? "Magic Items" : "Weapons",
		description: `${name} description`,
		isMagical,
		rarity: isMagical ? ("rare" as const) : null,
		requiresAttunement: isMagical,
		costValue: null,
		costDenomination: null,
		weight: null,
		thumbnailUrl: null,
		properties: [],
		stats: {},
	} satisfies CatalogueItemSearchResult;
}
