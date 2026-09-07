import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { CharacterDetailResponse } from "../types/index.js";
import { applyHealthResponse } from "./health.js";

const characterId = "00000000-0000-4000-8000-000000000001";
const otherId = "00000000-0000-4000-8000-000000000002";
const original = {
	character: {
		id: characterId,
		name: "Mira",
		className: "Fighter",
		level: 1,
		experiencePoints: 0,
		experience: {
			level: 1,
			experiencePoints: 0,
			currentLevelMinimum: 0,
			nextLevel: 2,
			nextLevelMinimum: 300,
			experienceIntoLevel: 0,
			experienceForNextLevel: 300,
			experienceRemaining: 300,
			progressPercent: 0,
			isMaxLevel: false,
		},
		health: { currentHp: 10, maxHp: 10, temporaryHp: 0, effectiveMaxHp: 10 },
		recentHealthChanges: [],
	},
	envelopeMetadata: "preserved",
} satisfies CharacterDetailResponse & { envelopeMetadata: string };
const response = {
	health: { ...original.character.health, currentHp: 7 },
	recentHealthChanges: [
		{
			id: otherId,
			previous: original.character.health,
			next: { ...original.character.health, currentHp: 7 },
			currentHpDelta: -3,
			maxHpDelta: 0,
			temporaryHpDelta: 0,
			createdAt: "2026-09-07T00:00:00.000Z",
		},
	],
};

it("updates only the originating detail while preserving unrelated query state and the envelope", () => {
	const client = new QueryClient();
	const ownKey = apiQueryKeys.getCharacter({ characterId });
	const unrelatedKeys = [
		apiQueryKeys.getCharacter({ characterId: otherId }),
		apiQueryKeys.listCharacters(),
		apiQueryKeys.getCharacterSpellSlots({ characterId }),
		apiQueryKeys.listCharacterSpells({ characterId }),
		apiQueryKeys.getCharacterTreasury({ characterId }),
		apiQueryKeys.listCharacterItems({ characterId }, {}),
		apiQueryKeys.listCharacterHistory({ characterId }, { limit: 20, offset: 0 }),
	];
	client.setQueryData(ownKey, original);
	for (const key of unrelatedKeys) client.setQueryData(key, { marker: key[1] });
	const before = unrelatedKeys.map((key) => client.getQueryState(key));
	applyHealthResponse(client, characterId, response);
	expect(client.getQueryData(ownKey)).toEqual({
		...original,
		character: { ...original.character, ...response },
	});
	unrelatedKeys.forEach((key, index) => {
		expect(client.getQueryState(key)).toBe(before[index]);
	});
	client.clear();
});

it("does not synthesize a detail entry when a late response arrives after cache removal", () => {
	const client = new QueryClient();
	applyHealthResponse(client, characterId, response);
	expect(client.getQueryData(apiQueryKeys.getCharacter({ characterId }))).toBeUndefined();
	expect(client.getQueryCache().getAll()).toHaveLength(0);
	client.clear();
});
