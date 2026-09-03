import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { characterHistoryQueryPrefix, invalidateCharacterHistory } from "./activity-cache.js";

describe("activity cache helpers", () => {
	it("shares a character-scoped history invalidation prefix", async () => {
		const characterId = "00000000-0000-4000-8000-000000000041";
		const queryClient = new QueryClient();
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

		await invalidateCharacterHistory(queryClient, characterId);

		expect(characterHistoryQueryPrefix(characterId)).toEqual([
			"api",
			"listCharacterHistory",
			{ characterId },
		]);
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: characterHistoryQueryPrefix(characterId),
		});
	});
});
