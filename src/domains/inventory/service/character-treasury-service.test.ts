import { describe, expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import type { CharacterDetail } from "../../characters/types/index.js";
import {
	type CharacterTreasuryMutation,
	type CharacterTreasuryMutationOptions,
	CharacterTreasuryPreconditionError,
	type CharacterTreasuryRepository,
} from "../repo/index.js";
import { type CharacterTreasury, getCurrencyTotalValue } from "../types/index.js";
import {
	createCharacterTreasuryService,
	InsufficientFundsError,
	TreasuryConflictError,
} from "./index.js";

const characterId = "00000000-0000-4000-8000-000000000001";
const userId = "00000000-0000-4000-8000-000000000002";

describe("createCharacterTreasuryService", () => {
	it("reads a zero treasury without invoking persistence mutation", async () => {
		const { repository, characterService } = fakeDependencies();
		const service = createCharacterTreasuryService({ repository, characterService });

		await expect(service.getCharacterTreasury(userId, characterId)).resolves.toEqual({
			treasury: treasury({ cp: 0, sp: 0, gp: 0, pp: 0 }),
		});
		expect(repository.findCharacterTreasury).toHaveBeenCalledWith(characterId);
		expect(repository.mutateCharacterTreasury).not.toHaveBeenCalled();
	});

	it("adds mixed funds through the atomic repository callback", async () => {
		const { repository, characterService } = fakeDependencies();
		const service = createCharacterTreasuryService({ repository, characterService });

		const response = await service.addCharacterTreasury(userId, characterId, {
			delta: { cp: 2, sp: 3, gp: 4, pp: 5 },
			expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
		});

		expect(response.treasury.balances).toEqual({ cp: 2, sp: 3, gp: 4, pp: 5 });
		expect(response.change.operation).toBe("add");
		expect(repository.mutateCharacterTreasury).toHaveBeenCalledTimes(1);
	});

	it("passes normalized notes, authoritative requests, and the actor into treasury writes", async () => {
		const dependencies = fakeDependencies({ cp: 0, sp: 0, gp: 2, pp: 0 });
		const service = createCharacterTreasuryService({
			repository: dependencies.repository,
			characterService: dependencies.characterService,
		});

		await service.addCharacterTreasury(userId, characterId, {
			delta: { cp: 0, sp: 0, gp: 1, pp: 0 },
			expectedPrevious: { cp: 0, sp: 0, gp: 2, pp: 0 },
			note: "  Reward from the guild  ",
		});
		expect(dependencies.repository.mutateCharacterTreasury).toHaveBeenNthCalledWith(
			1,
			characterId,
			expect.any(Function),
			{
				expectedPrevious: { cp: 0, sp: 0, gp: 2, pp: 0 },
				history: {
					operation: "add",
					requested: { delta: { cp: 0, sp: 0, gp: 1, pp: 0 } },
					note: "Reward from the guild",
					actorUserId: userId,
				},
			},
		);

		await service.spendCharacterTreasury(userId, characterId, {
			amount: { denomination: "gp", amount: 1 },
			expectedPrevious: { cp: 0, sp: 0, gp: 3, pp: 0 },
			note: " \t",
		});
		expect(dependencies.repository.mutateCharacterTreasury).toHaveBeenNthCalledWith(
			2,
			characterId,
			expect.any(Function),
			{
				expectedPrevious: { cp: 0, sp: 0, gp: 3, pp: 0 },
				history: {
					operation: "spend",
					requested: { amount: { denomination: "gp", amount: 1 } },
					note: null,
					actorUserId: userId,
				},
			},
		);
	});

	it("previews and applies legacy whole-balance normalization", async () => {
		const dependencies = fakeDependencies({ cp: 0, sp: 0, gp: 1, pp: 0 });
		const service = createCharacterTreasuryService({
			repository: dependencies.repository,
			characterService: dependencies.characterService,
		});

		const preview = await service.previewSpendCharacterTreasury(userId, characterId, {
			amount: { denomination: "sp", amount: 5 },
		});
		expect(preview.preview.next).toEqual({ cp: 0, sp: 5, gp: 0, pp: 0 });
		expect(preview.preview).not.toHaveProperty("change");

		const response = await service.spendCharacterTreasury(userId, characterId, {
			amount: { denomination: "sp", amount: 5 },
			expectedPrevious: preview.preview.previous,
		});

		expect(response.change.next).toEqual({ cp: 0, sp: 5, gp: 0, pp: 0 });
		expect(response.change).not.toHaveProperty("change");
	});

	it("rejects stale confirmations and prevents replaying a successful add", async () => {
		const dependencies = fakeDependencies();
		const service = createCharacterTreasuryService({
			repository: dependencies.repository,
			characterService: dependencies.characterService,
		});
		const request = {
			delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
			expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
		};

		await expect(service.addCharacterTreasury(userId, characterId, request)).resolves.toBeDefined();
		await expect(service.addCharacterTreasury(userId, characterId, request)).rejects.toMatchObject({
			code: "TREASURY_CONFLICT",
			details: {
				expectedPrevious: request.expectedPrevious,
				actualPrevious: { cp: 1, sp: 0, gp: 0, pp: 0 },
			},
		});
		await expect(
			service.spendCharacterTreasury(userId, characterId, {
				amount: { denomination: "cp", amount: 1 },
				expectedPrevious: request.expectedPrevious,
			}),
		).rejects.toBeInstanceOf(TreasuryConflictError);
		expect(dependencies.getBalances()).toEqual({ cp: 1, sp: 0, gp: 0, pp: 0 });
	});

	it("returns a strict add preview without returned change", async () => {
		const dependencies = fakeDependencies();
		const service = createCharacterTreasuryService({
			repository: dependencies.repository,
			characterService: dependencies.characterService,
		});

		const preview = await service.previewAddCharacterTreasury(userId, characterId, {
			delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
		});

		expect(preview.preview).toMatchObject({
			operation: "add",
			next: { cp: 1, sp: 0, gp: 0, pp: 0 },
			canApply: true,
		});
		expect(preview.preview).not.toHaveProperty("change");
	});

	it("previews insufficient spend without mutation and applies it with rollback-safe errors", async () => {
		const dependencies = fakeDependencies({ cp: 5, sp: 0, gp: 0, pp: 0 });
		const service = createCharacterTreasuryService({
			repository: dependencies.repository,
			characterService: dependencies.characterService,
		});
		const previewRequest = { amount: { denomination: "gp" as const, amount: 1 } };

		const preview = await service.previewSpendCharacterTreasury(
			userId,
			characterId,
			previewRequest,
		);
		expect(preview.preview).toMatchObject({
			canApply: false,
			error: {
				code: "INSUFFICIENT_FUNDS",
				available: { copper: 5, gp: 0.05 },
				requested: { copper: 100, gp: 1 },
			},
		});
		expect(preview.preview).not.toHaveProperty("change");
		expect(dependencies.repository.mutateCharacterTreasury).not.toHaveBeenCalled();

		await expect(
			service.spendCharacterTreasury(userId, characterId, {
				...previewRequest,
				expectedPrevious: preview.preview.previous,
			}),
		).rejects.toBeInstanceOf(InsufficientFundsError);
		expect(dependencies.getBalances()).toEqual({ cp: 5, sp: 0, gp: 0, pp: 0 });
	});

	it("converts exact funds and rejects inaccessible characters before repository access", async () => {
		const dependencies = fakeDependencies({ cp: 0, sp: 0, gp: 0, pp: 1 });
		const service = createCharacterTreasuryService({
			repository: dependencies.repository,
			characterService: dependencies.characterService,
		});

		const response = await service.convertCharacterTreasury(userId, characterId, {
			from: "pp",
			to: "gp",
			amount: 1,
		});
		expect(response.treasury.balances).toEqual({ cp: 0, sp: 0, gp: 10, pp: 0 });

		const inaccessible = fakeDependencies();
		inaccessible.characterService.getCharacter.mockRejectedValue(new CharacterNotFoundError());
		const inaccessibleService = createCharacterTreasuryService({
			repository: inaccessible.repository,
			characterService: inaccessible.characterService,
		});
		await expect(
			inaccessibleService.addCharacterTreasury(userId, characterId, {
				delta: { cp: 1, sp: 0, gp: 0, pp: 0 },
				expectedPrevious: { cp: 0, sp: 0, gp: 0, pp: 0 },
			}),
		).rejects.toBeInstanceOf(CharacterNotFoundError);
		expect(inaccessible.repository.findCharacterTreasury).not.toHaveBeenCalled();
		expect(inaccessible.repository.mutateCharacterTreasury).not.toHaveBeenCalled();
	});
});

function fakeDependencies(initial = { cp: 0, sp: 0, gp: 0, pp: 0 }) {
	let balances = { ...initial };
	const repository: CharacterTreasuryRepository = {
		findCharacterTreasury: vi.fn(async (id) => treasury({ ...balances }, id)),
		mutateCharacterTreasury: vi.fn(
			async (
				id: string,
				mutation: CharacterTreasuryMutation,
				options: CharacterTreasuryMutationOptions = {},
			) => {
				if (options.expectedPrevious && !balancesEqual(options.expectedPrevious, balances)) {
					throw new CharacterTreasuryPreconditionError(options.expectedPrevious, balances);
				}
				const next = mutation({ ...balances });
				balances = next;
				return treasury(next, id);
			},
		),
	};
	const characterService = {
		getCharacter: vi.fn().mockResolvedValue({} as CharacterDetail),
	};
	return { repository, characterService, getBalances: () => balances };
}

function balancesEqual(
	left: { cp: number; sp: number; gp: number; pp: number },
	right: { cp: number; sp: number; gp: number; pp: number },
) {
	return (
		left.cp === right.cp && left.sp === right.sp && left.gp === right.gp && left.pp === right.pp
	);
}

function treasury(
	balances: { cp: number; sp: number; gp: number; pp: number },
	id = characterId,
): CharacterTreasury {
	return { characterId: id, balances, totalValue: getCurrencyTotalValue(balances) };
}
