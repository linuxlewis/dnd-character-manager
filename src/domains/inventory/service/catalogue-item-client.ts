import type { CatalogueItemService } from "../../catalogue/service/index.js";
import {
	CatalogueItemsUnavailableError,
	createCatalogueItemService,
} from "../../catalogue/service/index.js";
import type { CatalogueItemDetails } from "../../catalogue/types/index.js";
import { CatalogueItemDetailsSchema, CatalogueItemIdSchema } from "../../catalogue/types/index.js";
import { CatalogueItemClientUnavailableError } from "./character-item-errors.js";

export type CatalogueItemSnapshot = Pick<
	CatalogueItemDetails,
	| "id"
	| "sourceKey"
	| "rulesVersion"
	| "name"
	| "kind"
	| "category"
	| "description"
	| "isMagical"
	| "rarity"
	| "requiresAttunement"
	| "costValue"
	| "costDenomination"
	| "weight"
	| "thumbnailUrl"
	| "properties"
	| "stats"
>;

export interface CharacterItemCatalogueClient {
	getItemDetails(id: string): Promise<CatalogueItemSnapshot | null>;
}

export interface CatalogueItemClientOptions {
	catalogueService?: Pick<CatalogueItemService, "getItemDetails">;
}

export function createCatalogueItemClient(
	options: CatalogueItemClientOptions = {},
): CharacterItemCatalogueClient {
	const catalogueService = options.catalogueService ?? createCatalogueItemService();

	return {
		async getItemDetails(id) {
			const parsedId = CatalogueItemIdSchema.parse(id);
			try {
				const item = await catalogueService.getItemDetails(parsedId);
				if (!item) return null;
				const parsed = CatalogueItemDetailsSchema.parse(item);
				return {
					id: parsed.id,
					sourceKey: parsed.sourceKey,
					rulesVersion: parsed.rulesVersion,
					name: parsed.name,
					kind: parsed.kind,
					category: parsed.category,
					description: parsed.description,
					isMagical: parsed.isMagical,
					rarity: parsed.rarity,
					requiresAttunement: parsed.requiresAttunement,
					costValue: parsed.costValue,
					costDenomination: parsed.costDenomination,
					weight: parsed.weight,
					thumbnailUrl: parsed.thumbnailUrl,
					properties: parsed.properties,
					stats: parsed.stats,
				};
			} catch (error) {
				if (error instanceof CatalogueItemsUnavailableError) {
					throw new CatalogueItemClientUnavailableError();
				}
				throw error;
			}
		},
	};
}
