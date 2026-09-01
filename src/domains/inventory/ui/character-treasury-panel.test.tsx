import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import {
	CharacterTreasuryPanel,
	toTreasuryData,
	updateTreasuryQueryCache,
} from "./character-treasury-panel.js";

describe("CharacterTreasuryPanel", () => {
	it("reads the character-scoped generated query without an existing treasury row", () => {
		const characterId = "00000000-0000-4000-8000-000000000001";
		const queryClient = new QueryClient();
		queryClient.setQueryData(apiQueryKeys.getCharacterTreasury({ characterId }), {
			treasury: {
				characterId,
				balances: { cp: 0, sp: 0, gp: 0, pp: 0 },
				totalValue: { copper: 0, gp: 0 },
			},
		});

		const html = renderToString(
			<MantineProvider>
				<QueryClientProvider client={queryClient}>
					<CharacterTreasuryPanel characterId={characterId} />
				</QueryClientProvider>
			</MantineProvider>,
		);

		expect(html).not.toContain("Personal Treasury</span>");
		expect(html.replaceAll("<!-- -->", "")).toContain("0.00 GP");
	});

	it("writes mutation responses into the character treasury cache", () => {
		const characterId = "00000000-0000-4000-8000-000000000001";
		const queryClient = new QueryClient();
		updateTreasuryQueryCache(queryClient, characterId, {
			treasury: {
				characterId,
				balances: { cp: 2, sp: 3, gp: 4, pp: 5 },
				totalValue: { copper: 5_432, gp: 54.32 },
			},
			change: {
				operation: "add",
				previous: { cp: 0, sp: 0, gp: 0, pp: 0 },
				next: { cp: 2, sp: 3, gp: 4, pp: 5 },
				delta: { cp: 2, sp: 3, gp: 4, pp: 5 },
				totalValue: { copper: 5_432, gp: 54.32 },
			},
		});

		expect(queryClient.getQueryData(apiQueryKeys.getCharacterTreasury({ characterId }))).toEqual({
			treasury: {
				characterId,
				balances: { cp: 2, sp: 3, gp: 4, pp: 5 },
				totalValue: { copper: 5_432, gp: 54.32 },
			},
		});
	});

	it("maps the character treasury envelope into the owner-neutral display shape", () => {
		const response = {
			treasury: {
				characterId: "00000000-0000-4000-8000-000000000001",
				balances: { cp: 5, sp: 4, gp: 3, pp: 1 },
				totalValue: { copper: 1_345, gp: 13.45 },
			},
		};

		expect(toTreasuryData(response)).toEqual({
			balances: response.treasury.balances,
			totalValue: response.treasury.totalValue,
		});
	});
});
