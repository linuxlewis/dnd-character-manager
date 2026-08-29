import { describe, expectTypeOf, it } from "vitest";
import type {
	CatalogueRemoteSpellDetailPort,
	CatalogueRemoteSpellSearchPort,
} from "./remote-spell.js";

describe("catalogue capability ports", () => {
	it("define reusable search and detail shapes", () => {
		expectTypeOf<CatalogueRemoteSpellSearchPort>().toMatchTypeOf<{
			search(input: { slotLevel: number; query: string }): Promise<unknown[]>;
		}>();
		expectTypeOf<CatalogueRemoteSpellDetailPort>().toMatchTypeOf<{
			detail(key: string): Promise<unknown>;
		}>();
	});
});
