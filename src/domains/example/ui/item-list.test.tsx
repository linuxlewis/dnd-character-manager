import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppProviders } from "../../../app/app-providers.js";
import { ItemList } from "./item-list.js";

describe("ItemList", () => {
	it("renders a deterministic loading state before browser effects run", () => {
		expect(
			renderToString(
				<AppProviders>
					<ItemList />
				</AppProviders>,
			),
		).toContain("Loading...");
	});
});
