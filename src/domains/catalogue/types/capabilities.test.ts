import { describe, expectTypeOf, it } from "vitest";
import type {
	CatalogueItemDetailPort,
	CatalogueItemSearchPort,
	CatalogueItemStatusPort,
	CatalogueRemoteSpellDetailPort,
	CatalogueRemoteSpellSearchPort,
} from "./index.js";

describe("catalogue capability ports", () => {
	it("define reusable search and detail shapes", () => {
		expectTypeOf<CatalogueRemoteSpellSearchPort>().toMatchTypeOf<{
			search(input: { slotLevel: number; query: string }): Promise<unknown[]>;
		}>();
		expectTypeOf<CatalogueRemoteSpellDetailPort>().toMatchTypeOf<{
			detail(key: string): Promise<unknown>;
		}>();
		expectTypeOf<CatalogueItemSearchPort>().toMatchTypeOf<{
			searchItems(input: unknown): Promise<unknown>;
		}>();
		expectTypeOf<CatalogueItemDetailPort>().toMatchTypeOf<{
			getItemDetails(key: string): Promise<unknown>;
		}>();
		expectTypeOf<CatalogueItemStatusPort>().toMatchTypeOf<{
			getItemStatus(): Promise<unknown>;
		}>();
	});
});
