import type { QueryClient } from "@tanstack/react-query";

export function characterHistoryQueryPrefix(characterId: string) {
	return ["api", "listCharacterHistory", { characterId }] as const;
}

export function invalidateCharacterHistory(queryClient: QueryClient, characterId: string) {
	return queryClient.invalidateQueries({ queryKey: characterHistoryQueryPrefix(characterId) });
}
