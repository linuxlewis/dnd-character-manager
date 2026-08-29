import type { QueryClient } from "@tanstack/react-query";
import { apiQueryKeys } from "../../../generated/api-client.generated.js";
import type { InventoryItem } from "../types/index.js";

export function reconcileItem(queryClient: QueryClient, characterId: string, item: InventoryItem) {
	queryClient.setQueryData(apiQueryKeys.getCharacterItemDetails({ characterId, itemId: item.id }), {
		item,
	});
	void queryClient.invalidateQueries({ queryKey: characterItemsQueryPrefix(characterId) });
}

export function characterItemsQueryPrefix(characterId: string) {
	return ["api", "listCharacterItems", { characterId }] as const;
}
