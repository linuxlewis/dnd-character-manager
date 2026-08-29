import type { CharacterService } from "../../characters/service/index.js";
import { createCharacterService } from "../../characters/service/index.js";
import type { CharacterTreasuryRepository } from "../repo/index.js";
import { createCharacterTreasuryRepository } from "../repo/index.js";
import {
	type AddCharacterTreasuryRequest,
	AddCharacterTreasuryRequestSchema,
	type AddCharacterTreasuryResponse,
	AddCharacterTreasuryResponseSchema,
	type CharacterTreasuryPreviewResponse,
	CharacterTreasuryPreviewResponseSchema,
	type CharacterTreasuryResponse,
	CharacterTreasuryResponseSchema,
	type ConvertCharacterTreasuryRequest,
	ConvertCharacterTreasuryRequestSchema,
	type ConvertCharacterTreasuryResponse,
	ConvertCharacterTreasuryResponseSchema,
	type CurrencyBalance,
	getCurrencyTotalValue,
	type SpendCharacterTreasuryRequest,
	SpendCharacterTreasuryRequestSchema,
	type SpendCharacterTreasuryResponse,
	SpendCharacterTreasuryResponseSchema,
} from "../types/index.js";
import { InsufficientFundsError, TreasuryOverflowError } from "./character-treasury-errors.js";
import {
	type CurrencyPlan,
	planAdd,
	planConversion,
	planSpend,
	type SpendPlan,
} from "./currency-operations.js";

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
		input: AddCharacterTreasuryRequest,
	): Promise<CharacterTreasuryPreviewResponse>;
	previewSpendCharacterTreasury(
		userId: string,
		characterId: string,
		input: SpendCharacterTreasuryRequest,
	): Promise<CharacterTreasuryPreviewResponse>;
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
			const treasury = await repository.mutateCharacterTreasury(characterId, (current) => {
				const nextPlan = planAdd(current, request);
				plan = nextPlan;
				return nextPlan.next;
			});
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
			const treasury = await repository.mutateCharacterTreasury(characterId, (current) => {
				const nextPlan = planSpend(current, request);
				plan = nextPlan;
				return nextPlan.next;
			});
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
			const treasury = await repository.mutateCharacterTreasury(characterId, (current) => {
				const nextPlan = planConversion(current, request);
				plan = nextPlan;
				return nextPlan.next;
			});
			if (!plan) throw new TreasuryOverflowError("Treasury mutation did not produce a plan.");
			return ConvertCharacterTreasuryResponseSchema.parse({
				treasury,
				change: { operation: "convert", ...plan, totalValue: getCurrencyTotalValue(plan.next) },
			});
		},

		async previewAddCharacterTreasury(userId, characterId, input) {
			const request = AddCharacterTreasuryRequestSchema.parse(input);
			const treasury = await readAuthorizedTreasury(
				userId,
				characterId,
				characterService,
				repository,
			);
			return previewFromPlan(treasury, "add", planAdd(treasury.treasury.balances, request));
		},

		async previewSpendCharacterTreasury(userId, characterId, input) {
			const request = SpendCharacterTreasuryRequestSchema.parse(input);
			const treasury = await readAuthorizedTreasury(
				userId,
				characterId,
				characterService,
				repository,
			);
			try {
				const plan = planSpend(treasury.treasury.balances, request);
				return previewFromPlan(treasury, "spend", plan, plan.change);
			} catch (error) {
				if (!(error instanceof InsufficientFundsError)) throw error;
				const balances = treasury.treasury.balances;
				return CharacterTreasuryPreviewResponseSchema.parse({
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

function previewFromPlan(
	treasury: CharacterTreasuryResponse,
	operation: "add" | "spend",
	plan: CurrencyPlan,
	change?: CurrencyBalance,
): CharacterTreasuryPreviewResponse {
	return CharacterTreasuryPreviewResponseSchema.parse({
		treasury: treasury.treasury,
		preview: {
			operation,
			previous: plan.previous,
			next: plan.next,
			delta: plan.delta,
			totalValue: getCurrencyTotalValue(plan.next),
			canApply: true,
			...(change === undefined ? {} : { change }),
		},
	});
}
