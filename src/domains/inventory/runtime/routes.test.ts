import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import type { CharacterTreasuryService } from "../service/index.js";
import {
	InsufficientDenominationError,
	InsufficientFundsError,
	TreasuryConflictError,
} from "../service/index.js";
import { registerCharacterTreasuryRoutes } from "./routes.js";

const userId = "00000000-0000-4000-8000-000000000001";
const characterId = "00000000-0000-4000-8000-000000000002";
const zeroBalance = { cp: 0, sp: 0, gp: 0, pp: 0 };

describe("registerCharacterTreasuryRoutes", () => {
	it("authenticates and forwards all treasury operations", async () => {
		const service = fakeService();
		const responses = {
			treasury: {
				characterId,
				balances: { cp: 0, sp: 0, gp: 0, pp: 0 },
				totalValue: { copper: 0, gp: 0 },
			},
		};
		service.getCharacterTreasury.mockResolvedValue(responses);
		service.addCharacterTreasury.mockResolvedValue(responses as never);
		service.spendCharacterTreasury.mockResolvedValue(responses as never);
		service.convertCharacterTreasury.mockResolvedValue(responses as never);
		service.previewAddCharacterTreasury.mockResolvedValue(responses as never);
		service.previewSpendCharacterTreasury.mockResolvedValue({
			treasury: responses.treasury,
			preview: {
				operation: "spend",
				previous: responses.treasury.balances,
				next: { cp: 0, sp: 5, gp: 0, pp: 0 },
				delta: { cp: 0, sp: 5, gp: -1, pp: 0 },
				totalValue: { copper: 50, gp: 0.5 },
				canApply: true,
				change: { cp: 0, sp: 5, gp: 0, pp: 0 },
			},
		} as never);
		const app = await buildApp(service);

		try {
			const getResponse = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/treasury`,
			});
			const addResponse = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/treasury`,
				payload: {
					delta: { cp: 1, sp: 2, gp: 3, pp: 4 },
					expectedPrevious: zeroBalance,
				},
			});
			const spendResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/treasury/spend`,
				payload: { amount: { denomination: "gp", amount: 1 }, expectedPrevious: zeroBalance },
			});
			const convertResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/treasury/convert`,
				payload: { from: "pp", to: "gp", amount: 1, note: "  Converted coins  " },
			});
			const addPreviewResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/treasury/preview/add`,
				payload: { delta: { cp: 1, sp: 0, gp: 0, pp: 0 } },
			});
			const spendPreviewResponse = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/treasury/preview/spend`,
				payload: { amount: { denomination: "sp", amount: 1 } },
			});

			expect(getResponse.statusCode).toBe(200);
			expect(addResponse.statusCode).toBe(200);
			expect(spendResponse.statusCode).toBe(200);
			expect(convertResponse.statusCode).toBe(200);
			expect(addPreviewResponse.statusCode).toBe(200);
			expect(spendPreviewResponse.statusCode).toBe(200);
			expect(spendPreviewResponse.json().preview.change).toEqual({
				cp: 0,
				sp: 5,
				gp: 0,
				pp: 0,
			});
			expect(service.addCharacterTreasury).toHaveBeenCalledWith(userId, characterId, {
				delta: { cp: 1, sp: 2, gp: 3, pp: 4 },
				expectedPrevious: zeroBalance,
			});
			expect(service.spendCharacterTreasury).toHaveBeenCalledWith(userId, characterId, {
				amount: { denomination: "gp", amount: 1 },
				expectedPrevious: zeroBalance,
			});
			expect(service.convertCharacterTreasury).toHaveBeenCalledWith(userId, characterId, {
				from: "pp",
				to: "gp",
				amount: 1,
				note: "Converted coins",
			});
			expect(service.previewAddCharacterTreasury).toHaveBeenCalledWith(userId, characterId, {
				delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
			});
			expect(service.previewSpendCharacterTreasury).toHaveBeenCalledWith(userId, characterId, {
				amount: { denomination: "sp", amount: 1 },
			});
		} finally {
			await app.close();
		}
	});

	it("rejects malformed boundaries before services and maps stable treasury errors", async () => {
		const service = fakeService();
		const app = await buildApp(service);

		try {
			const invalidPath = await app.inject({
				method: "GET",
				url: "/api/characters/not-a-uuid/treasury",
			});
			const invalidBody = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/treasury`,
				payload: { delta: { cp: -1, sp: 0, gp: 0, pp: 0 } },
			});
			expect(invalidPath.statusCode).toBe(400);
			expect(invalidBody.statusCode).toBe(400);
			expect(service.getCharacterTreasury).not.toHaveBeenCalled();
			expect(service.addCharacterTreasury).not.toHaveBeenCalled();

			service.getCharacterTreasury.mockRejectedValue(new CharacterNotFoundError());
			const notFound = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/treasury`,
			});
			expect(notFound.statusCode).toBe(404);

			service.spendCharacterTreasury.mockRejectedValue(
				new InsufficientFundsError({
					message: "The treasury does not contain enough currency.",
					available: { copper: 0, gp: 0 },
					requested: { copper: 100, gp: 1 },
				}),
			);
			const insufficient = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/treasury/spend`,
				payload: { amount: { denomination: "gp", amount: 1 }, expectedPrevious: zeroBalance },
			});
			expect(insufficient.statusCode).toBe(409);
			expect(insufficient.json().error.code).toBe("INSUFFICIENT_FUNDS");

			service.addCharacterTreasury.mockRejectedValue(
				new TreasuryConflictError({
					message: "The character treasury changed after the operation was previewed.",
					expectedPrevious: zeroBalance,
					actualPrevious: { cp: 1, sp: 0, gp: 0, pp: 0 },
				}),
			);
			const conflict = await app.inject({
				method: "PUT",
				url: `/api/characters/${characterId}/treasury`,
				payload: { delta: { cp: 1, sp: 0, gp: 0, pp: 0 }, expectedPrevious: zeroBalance },
			});
			expect(conflict.statusCode).toBe(409);
			expect(conflict.json().error).toMatchObject({
				code: "TREASURY_CONFLICT",
				expectedPrevious: zeroBalance,
				actualPrevious: { cp: 1, sp: 0, gp: 0, pp: 0 },
			});

			service.convertCharacterTreasury.mockRejectedValue(
				new InsufficientDenominationError("pp", 1, 0),
			);
			const missingCoins = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/treasury/convert`,
				payload: { from: "pp", to: "gp", amount: 1 },
			});
			expect(missingCoins.statusCode).toBe(409);
			expect(missingCoins.json().error.code).toBe("INSUFFICIENT_DENOMINATION");
		} finally {
			await app.close();
		}
	});
});

async function buildApp(characterTreasuryService: CharacterTreasuryService) {
	const app = Fastify();
	await registerCharacterTreasuryRoutes(app, {
		characterTreasuryService,
		getCurrentUser: async () => ({
			user: { id: userId, isAnonymous: true, name: "Anonymous" },
		}),
	});
	return app;
}

function fakeService() {
	return {
		getCharacterTreasury: vi.fn(),
		addCharacterTreasury: vi.fn(),
		spendCharacterTreasury: vi.fn(),
		convertCharacterTreasury: vi.fn(),
		previewAddCharacterTreasury: vi.fn(),
		previewSpendCharacterTreasury: vi.fn(),
	} satisfies CharacterTreasuryService;
}
