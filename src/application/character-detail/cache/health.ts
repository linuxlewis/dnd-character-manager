import type { QueryClient } from "@tanstack/react-query";
import type { UpdateCharacterHealthResponse } from "../../../domains/health/types/index.js";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { CharacterDetailResponse } from "../types/index.js";

export function applyHealthResponse(
	queryClient: QueryClient,
	characterId: string,
	response: UpdateCharacterHealthResponse,
) {
	queryClient.setQueryData<CharacterDetailResponse>(
		apiQueryKeys.getCharacter({ characterId }),
		(current) =>
			current
				? {
						...current,
						character: {
							...current.character,
							health: response.health,
							recentHealthChanges: response.recentHealthChanges,
						},
					}
				: current,
	);
}
