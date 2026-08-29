import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ApiClientError, apiQueryKeys } from "../../../generated/api-client.generated.js";
import {
	classifyTreasuryConfirmationOutcome,
	reconcileAndRelease,
	reconcileTreasuryQuery,
	toAddCharacterTreasuryRequest,
	toSpendCharacterTreasuryRequest,
	toTreasuryConflictError,
} from "./character-treasury-confirmation.js";

describe("character treasury confirmation adapter", () => {
	it("waits for the authoritative treasury query to reconcile", async () => {
		const characterId = "00000000-0000-4000-8000-000000000001";
		const queryClient = new QueryClient();
		queryClient.setQueryData(
			apiQueryKeys.getCharacterTreasury({ characterId }),
			zeroTreasury(characterId),
		);
		let resolveRefetch!: () => void;
		const refetch = new Promise<void>((resolve) => {
			resolveRefetch = resolve;
		});
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		invalidateQueries.mockReturnValue(refetch);

		let settled = false;
		const reconciliation = reconcileTreasuryQuery(queryClient, characterId).then(() => {
			settled = true;
		});
		await Promise.resolve();
		expect(settled).toBe(false);

		resolveRefetch();
		await reconciliation;
		expect(settled).toBe(true);
		expect(invalidateQueries).toHaveBeenCalledWith(
			{ queryKey: apiQueryKeys.getCharacterTreasury({ characterId }) },
			{ throwOnError: true },
		);
	});

	it("keeps failed reconciliation recoverable without replaying completion", async () => {
		const characterId = "00000000-0000-4000-8000-000000000001";
		const queryClient = new QueryClient();
		queryClient.setQueryData(
			apiQueryKeys.getCharacterTreasury({ characterId }),
			zeroTreasury(characterId),
		);
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		invalidateQueries.mockRejectedValueOnce(new Error("treasury GET failed"));
		invalidateQueries.mockResolvedValueOnce();
		const setState = vi.fn();
		const onComplete = vi.fn();
		const onIndeterminate = vi.fn();
		const confirmationRef = {
			current: {
				conflict: false,
				expectedNext: { cp: 0, sp: 0, gp: 1, pp: 0 },
				mutationSucceeded: true,
				onApplied: onComplete,
				onIndeterminate,
			},
		};

		await reconcileAndRelease(queryClient, characterId, setState, confirmationRef);
		expect(setState).toHaveBeenLastCalledWith({
			error: expect.objectContaining({ message: "treasury GET failed" }),
			pending: false,
		});
		expect(onComplete).not.toHaveBeenCalled();
		expect(onIndeterminate).not.toHaveBeenCalled();
		expect(confirmationRef.current?.onApplied).toBe(onComplete);

		await reconcileAndRelease(queryClient, characterId, setState, confirmationRef);
		expect(setState).toHaveBeenLastCalledWith({ error: null, pending: false });
		expect(onComplete).toHaveBeenCalledOnce();
		expect(confirmationRef.current).toBeNull();
	});

	it("reports an indeterminate outcome after a lost response and changed balance", async () => {
		const characterId = "00000000-0000-4000-8000-000000000001";
		const queryClient = new QueryClient();
		queryClient.setQueryData(apiQueryKeys.getCharacterTreasury({ characterId }), {
			treasury: {
				...zeroTreasury(characterId).treasury,
				balances: { cp: 0, sp: 0, gp: 3, pp: 0 },
				totalValue: { copper: 300, gp: 3 },
			},
		});
		const onApplied = vi.fn();
		const onIndeterminate = vi.fn();
		const confirmationRef = {
			current: {
				conflict: false,
				expectedNext: { cp: 0, sp: 0, gp: 2, pp: 0 },
				mutationSucceeded: false,
				onApplied,
				onIndeterminate,
			},
		};

		await reconcileAndRelease(queryClient, characterId, vi.fn(), confirmationRef);

		expect(onApplied).not.toHaveBeenCalled();
		expect(onIndeterminate).toHaveBeenCalledOnce();
		expect(confirmationRef.current).toBeNull();
	});

	it("adds the displayed preview balance to both mutation bodies", () => {
		const previous = { cp: 1, sp: 2, gp: 3, pp: 4 };

		expect(
			toAddCharacterTreasuryRequest(
				{ delta: { cp: 0, sp: 0, gp: 2, pp: 0 } },
				{
					operation: "add",
					previous,
					next: { ...previous, gp: 5 },
					totalValue: { copper: 4_521, gp: 45.21 },
					canApply: true,
				},
			),
		).toEqual({
			delta: { cp: 0, sp: 0, gp: 2, pp: 0 },
			expectedPrevious: previous,
		});
		expect(
			toSpendCharacterTreasuryRequest(
				{ amount: { denomination: "gp", amount: 1 } },
				{
					operation: "spend",
					previous,
					next: { ...previous, gp: 2 },
					totalValue: { copper: 4_221, gp: 42.21 },
					canApply: true,
				},
			),
		).toEqual({
			amount: { denomination: "gp", amount: 1 },
			expectedPrevious: previous,
		});
	});

	it("classifies applied, conflict, and indeterminate confirmation outcomes", () => {
		const expectedNext = { cp: 0, sp: 0, gp: 2, pp: 0 };
		const confirmation = {
			conflict: false,
			expectedNext,
			mutationSucceeded: false,
			onApplied: vi.fn(),
			onIndeterminate: vi.fn(),
		};

		expect(classifyTreasuryConfirmationOutcome(confirmation, expectedNext)).toBe("applied");
		expect(
			classifyTreasuryConfirmationOutcome(
				{ ...confirmation, mutationSucceeded: true },
				{ ...expectedNext, gp: 4 },
			),
		).toBe("applied");
		expect(
			classifyTreasuryConfirmationOutcome({ ...confirmation, conflict: true }, expectedNext),
		).toBe("conflict");
		expect(classifyTreasuryConfirmationOutcome(confirmation, { ...expectedNext, gp: 4 })).toBe(
			"indeterminate",
		);
	});

	it("adapts an explicit treasury conflict into re-preview guidance", () => {
		expect(
			toTreasuryConflictError(
				new ApiClientError(409, {
					error: {
						code: "TREASURY_CONFLICT",
						message: "Treasury changed after preview.",
						expectedPrevious: { cp: 0, sp: 0, gp: 1, pp: 0 },
						actualPrevious: { cp: 0, sp: 0, gp: 2, pp: 0 },
					},
				}),
			)?.message,
		).toContain("preview again");
	});
});

function zeroTreasury(characterId: string) {
	return {
		treasury: {
			characterId,
			balances: { cp: 0, sp: 0, gp: 0, pp: 0 },
			totalValue: { copper: 0, gp: 0 },
		},
	};
}
