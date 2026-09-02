import type { CharacterService } from "../../characters/service/index.js";
import { createCharacterService } from "../../characters/service/index.js";
import {
	type CharacterTreasuryHistoryInput,
	CharacterTreasuryPreconditionError,
	type CharacterTreasuryRepository,
	createCharacterTreasuryRepository,
} from "../repo/index.js";
import {
	type AddCharacterTreasuryPreviewRequest,
	AddCharacterTreasuryPreviewRequestSchema,
	type AddCharacterTreasuryPreviewResponse,
	AddCharacterTreasuryPreviewResponseSchema,
	type AddCharacterTreasuryRequest,
	AddCharacterTreasuryRequestSchema,
	type AddCharacterTreasuryResponse,
	AddCharacterTreasuryResponseSchema,
	type CharacterTreasuryResponse,
	CharacterTreasuryResponseSchema,
	type ConvertCharacterTreasuryRequest,
	ConvertCharacterTreasuryRequestSchema,
	type ConvertCharacterTreasuryResponse,
	ConvertCharacterTreasuryResponseSchema,
	type CurrencyBalance,
	type CurrencyPlan,
	getCurrencyTotalValue,
	type SpendCharacterTreasuryPreviewRequest,
	SpendCharacterTreasuryPreviewRequestSchema,
	type SpendCharacterTreasuryPreviewResponse,
	SpendCharacterTreasuryPreviewResponseSchema,
	type SpendCharacterTreasuryRequest,
	SpendCharacterTreasuryRequestSchema,
	type SpendCharacterTreasuryResponse,
	SpendCharacterTreasuryResponseSchema,
	type SpendPlan,
} from "../types/index.js";
import {
	InsufficientFundsError,
	TreasuryConflictError,
	TreasuryOverflowError,
} from "./character-treasury-errors.js";
import { planAdd, planConversion, planSpend } from "./currency-operations.js";

export interface CharacterTreasuryService {
	getCharacterTreasury(userId: string, characterId: string): Promise<CharacterTreasuryResponse>;
	addCharacterTreasury(
		userId: string,
		characterId: string,
		input: AddCharacterTreasuryRequest,
	): Promise<AddCharacterTreasuryResponse>;
	spendCharacterTreasury(
		userId: string,
		characterId: string,
		input: SpendCharacterTreasuryRequest,
	): Promise<SpendCharacterTreasuryResponse>;
	convertCharacterTreasury(
		userId: string,
		characterId: string,
		input: ConvertCharacterTreasuryRequest,
	): Promise<ConvertCharacterTreasuryResponse>;
	previewAddCharacterTreasury(
		userId: string,
		characterId: string,
		input: AddCharacterTreasuryPreviewRequest,
	): Promise<AddCharacterTreasuryPreviewResponse>;
	previewSpendCharacterTreasury(
		userId: string,
		characterId: string,
		input: SpendCharacterTreasuryPreviewRequest,
	): Promise<SpendCharacterTreasuryPreviewResponse>;
}

export interface CharacterTreasuryServiceOptions {
	repository?: CharacterTreasuryRepository;
	characterService?: Pick<CharacterService, "getCharacter">;
}

export function createCharacterTreasuryService(
	options: CharacterTreasuryServiceOptions = {},
): CharacterTreasuryService {
	const repository = options.repository ?? createCharacterTreasuryRepository();
	const characterService = options.characterService ?? createCharacterService();

	return {
		async getCharacterTreasury(userId, characterId) {
			await characterService.getCharacter(userId, characterId);
			return CharacterTreasuryResponseSchema.parse({
				treasury: await repository.findCharacterTreasury(characterId),
			});
		},

		async addCharacterTreasury(userId, characterId, input) {
			const request = AddCharacterTreasuryRequestSchema.parse(input);
			await characterService.getCharacter(userId, characterId);
			let plan: CurrencyPlan | undefined;
			const treasury = await mutateWithPreviewPrecondition(
				repository,
				characterId,
				(current) => {
					const nextPlan = planAdd(current, { delta: request.delta });
					plan = nextPlan;
					return nextPlan.next;
				},
				request.expectedPrevious,
				{
					operation: "add",
					requested: { delta: request.delta },
					note: request.note ?? null,
					actorUserId: userId,
				},
			);
			if (!plan) throw new TreasuryOverflowError("Treasury mutation did not produce a plan.");
			return AddCharacterTreasuryResponseSchema.parse({
				treasury,
				change: { operation: "add", ...plan, totalValue: getCurrencyTotalValue(plan.next) },
			});
		},

		async spendCharacterTreasury(userId, characterId, input) {
			const request = SpendCharacterTreasuryRequestSchema.parse(input);
			await characterService.getCharacter(userId, characterId);
			let plan: SpendPlan | undefined;
			const treasury = await mutateWithPreviewPrecondition(
				repository,
				characterId,
				(current) => {
					const nextPlan = planSpend(current, { amount: request.amount });
					plan = nextPlan;
					return nextPlan.next;
				},
				request.expectedPrevious,
				{
					operation: "spend",
					requested: { amount: request.amount },
					note: request.note ?? null,
					actorUserId: userId,
				},
			);
			if (!plan) throw new TreasuryOverflowError("Treasury mutation did not produce a plan.");
			return SpendCharacterTreasuryResponseSchema.parse({
				treasury,
				change: {
					operation: "spend",
					...plan,
					totalValue: getCurrencyTotalValue(plan.next),
					spent: request.amount,
				},
			});
		},

		async convertCharacterTreasury(userId, characterId, input) {
			const request = ConvertCharacterTreasuryRequestSchema.parse(input);
			await characterService.getCharacter(userId, characterId);
			let plan: ReturnType<typeof planConversion> | undefined;
			const treasury = await mutateWithPreviewPrecondition(
				repository,
				characterId,
				(current) => {
					const nextPlan = planConversion(current, {
						from: request.from,
						to: request.to,
						amount: request.amount,
					});
					plan = nextPlan;
					return nextPlan.next;
				},
				undefined,
				{
					operation: "convert",
					requested: { from: request.from, to: request.to, amount: request.amount },
					note: request.note ?? null,
					actorUserId: userId,
				},
			);
			if (!plan) throw new TreasuryOverflowError("Treasury mutation did not produce a plan.");
			return ConvertCharacterTreasuryResponseSchema.parse({
				treasury,
				change: { operation: "convert", ...plan, totalValue: getCurrencyTotalValue(plan.next) },
			});
		},

		async previewAddCharacterTreasury(userId, characterId, input) {
			const request = AddCharacterTreasuryPreviewRequestSchema.parse(input);
			const treasury = await readAuthorizedTreasury(
				userId,
				characterId,
				characterService,
				repository,
			);
			return previewAddFromPlan(treasury, planAdd(treasury.treasury.balances, request));
		},

		async previewSpendCharacterTreasury(userId, characterId, input) {
			const request = SpendCharacterTreasuryPreviewRequestSchema.parse(input);
			const treasury = await readAuthorizedTreasury(
				userId,
				characterId,
				characterService,
				repository,
			);
			try {
				const plan = planSpend(treasury.treasury.balances, request);
				return previewSpendFromPlan(treasury, plan);
			} catch (error) {
				if (!(error instanceof InsufficientFundsError)) throw error;
				const balances = treasury.treasury.balances;
				return SpendCharacterTreasuryPreviewResponseSchema.parse({
					treasury: treasury.treasury,
					preview: {
						operation: "spend",
						previous: balances,
						next: balances,
						delta: { cp: 0, sp: 0, gp: 0, pp: 0 },
						totalValue: treasury.treasury.totalValue,
						canApply: false,
						error: error.details,
					},
				});
			}
		},
	};
}

async function mutateWithPreviewPrecondition(
	repository: CharacterTreasuryRepository,
	characterId: string,
	mutation: (current: CurrencyBalance) => CurrencyBalance,
	expectedPrevious?: CurrencyBalance,
	history?: CharacterTreasuryHistoryInput,
) {
	try {
		return await repository.mutateCharacterTreasury(characterId, mutation, {
			...(expectedPrevious === undefined ? {} : { expectedPrevious }),
			...(history === undefined ? {} : { history }),
		});
	} catch (error) {
		if (!(error instanceof CharacterTreasuryPreconditionError)) throw error;
		throw new TreasuryConflictError({
			message: error.message,
			expectedPrevious: error.expectedPrevious,
			actualPrevious: error.actualPrevious,
		});
	}
}

async function readAuthorizedTreasury(
	userId: string,
	characterId: string,
	characterService: Pick<CharacterService, "getCharacter">,
	repository: CharacterTreasuryRepository,
): Promise<CharacterTreasuryResponse> {
	await characterService.getCharacter(userId, characterId);
	return CharacterTreasuryResponseSchema.parse({
		treasury: await repository.findCharacterTreasury(characterId),
	});
}

function previewAddFromPlan(
	treasury: CharacterTreasuryResponse,
	plan: CurrencyPlan,
): AddCharacterTreasuryPreviewResponse {
	return AddCharacterTreasuryPreviewResponseSchema.parse({
		treasury: treasury.treasury,
		preview: {
			operation: "add",
			previous: plan.previous,
			next: plan.next,
			delta: plan.delta,
			totalValue: getCurrencyTotalValue(plan.next),
			canApply: true,
		},
	});
}

function previewSpendFromPlan(
	treasury: CharacterTreasuryResponse,
	plan: SpendPlan,
): SpendCharacterTreasuryPreviewResponse {
	return SpendCharacterTreasuryPreviewResponseSchema.parse({
		treasury: treasury.treasury,
		preview: {
			operation: "spend",
			previous: plan.previous,
			next: plan.next,
			delta: plan.delta,
			totalValue: getCurrencyTotalValue(plan.next),
			canApply: true,
			...(plan.change === undefined ? {} : { change: plan.change }),
		},
	});
}
