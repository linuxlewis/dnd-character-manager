import type { CreateCharacterItemRequest, UpdateCharacterItemRequest } from "../types/index.js";
import type { CharacterItemCatalogueClient } from "./catalogue-item-client.js";
import { mapCatalogueItemToInventoryItem } from "./catalogue-item-mapping.js";
import {
	CatalogueItemClientUnavailableError,
	CatalogueItemNotFoundError,
	CatalogueItemUnavailableError,
} from "./character-item-errors.js";

export async function withCatalogueSnapshot<
	T extends CreateCharacterItemRequest | UpdateCharacterItemRequest,
>(request: T, catalogueClient: CharacterItemCatalogueClient) {
	if (request.catalogueItemId === undefined || request.catalogueItemId === null) return request;
	const catalogueItem = await lookupCatalogueItem(request.catalogueItemId, catalogueClient);
	return { ...request, ...mapCatalogueItemToInventoryItem(catalogueItem) };
}

export async function withOptionalCatalogueSnapshot(
	request: UpdateCharacterItemRequest,
	catalogueClient: CharacterItemCatalogueClient,
) {
	if (!Object.hasOwn(request, "catalogueItemId")) return request;
	if (request.catalogueItemId === null) {
		return {
			...request,
			catalogueItemId: null,
			catalogueSourceKey: null,
			catalogueRulesVersion: null,
		};
	}
	return withCatalogueSnapshot(request, catalogueClient);
}

async function lookupCatalogueItem(id: string, catalogueClient: CharacterItemCatalogueClient) {
	try {
		const item = await catalogueClient.getItemDetails(id);
		if (!item) throw new CatalogueItemNotFoundError();
		return item;
	} catch (error) {
		if (error instanceof CatalogueItemNotFoundError) throw error;
		if (error instanceof CatalogueItemClientUnavailableError) {
			throw new CatalogueItemUnavailableError();
		}
		throw new CatalogueItemUnavailableError();
	}
}
