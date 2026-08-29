import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import {
	CharacterTreasuryPanel,
	consumeTreasuryPreview,
	reconcileTreasuryQuery,
	toSpendTreasuryPreview,
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

		expect(html).toContain("Personal Treasury");
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

	it("adapts character envelopes into owner-neutral shapes without changing server change", () => {
		const characterResponse = {
			treasury: {
				characterId: "00000000-0000-4000-8000-000000000001",
				balances: { cp: 5, sp: 4, gp: 3, pp: 1 },
				totalValue: { copper: 1_345, gp: 13.45 },
			},
		};
		const spendResponse = {
			...characterResponse,
			preview: {
				operation: "spend" as const,
				previous: characterResponse.treasury.balances,
				next: { cp: 5, sp: 9, gp: 2, pp: 1 },
				delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
				totalValue: { copper: 1_295, gp: 12.95 },
				canApply: true,
				change: { cp: 0, sp: 5, gp: 0, pp: 0 },
			},
		};

		expect(toTreasuryData(characterResponse)).toEqual({
			balances: characterResponse.treasury.balances,
			totalValue: characterResponse.treasury.totalValue,
		});
		expect(toSpendTreasuryPreview(spendResponse)).toEqual(spendResponse.preview);
	});

	it("consumes a preview and requests treasury reconciliation", async () => {
		const setPreviewRequest = vi.fn();
		const resetPreview = vi.fn();
		consumeTreasuryPreview(setPreviewRequest, resetPreview);
		expect(setPreviewRequest).toHaveBeenCalledWith(null);
		expect(resetPreview).toHaveBeenCalledOnce();

		const characterId = "00000000-0000-4000-8000-000000000001";
		const queryClient = new QueryClient();
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		await reconcileTreasuryQuery(queryClient, characterId);
		expect(invalidateQueries).toHaveBeenCalledWith(
			{
				queryKey: apiQueryKeys.getCharacterTreasury({ characterId }),
			},
			{ throwOnError: true },
		);
	});

	it("does not resolve reconciliation until the treasury refetch settles", async () => {
		const characterId = "00000000-0000-4000-8000-000000000001";
		const queryClient = new QueryClient();
		let resolveRefetch!: () => void;
		const refetch = new Promise<void>((resolve) => {
			resolveRefetch = resolve;
		});
		vi.spyOn(queryClient, "invalidateQueries").mockReturnValue(refetch);

		let settled = false;
		const reconciliation = reconcileTreasuryQuery(queryClient, characterId).then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);

		resolveRefetch();
		await reconciliation;
		expect(settled).toBe(true);
	});
});
