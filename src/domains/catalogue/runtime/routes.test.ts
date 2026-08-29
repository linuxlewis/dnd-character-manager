import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { type CatalogueItemService, CatalogueItemsUnavailableError } from "../service/index.js";
import { registerCatalogueRoutes } from "./routes.js";

describe("catalogue routes", () => {
	it("validates search query parameters at the HTTP boundary", async () => {
		const service = fakeService();
		const app = Fastify();
		await registerCatalogueRoutes(app, { itemService: service });

		const response = await app.inject({ method: "GET", url: "/api/catalogue/items?limit=0" });

		expect(response.statusCode).toBe(400);
		expect(service.searchItems).not.toHaveBeenCalled();
		await app.close();
	});

	it("returns an explicit unavailable readiness response for unseeded items", async () => {
		const service = fakeService();
		service.searchItems.mockRejectedValue(new CatalogueItemsUnavailableError());
		service.getItemDetails.mockRejectedValue(new CatalogueItemsUnavailableError());
		const app = Fastify();
		await registerCatalogueRoutes(app, { itemService: service });

		const response = await app.inject({ method: "GET", url: "/api/catalogue/items?q=rope" });
		const detail = await app.inject({
			method: "GET",
			url: "/api/catalogue/items/00000000-0000-4000-8000-000000000001",
		});

		expect(response.statusCode).toBe(503);
		expect(response.json()).toMatchObject({
			readiness: "unavailable",
			capability: "items",
			code: "catalogue_items_unavailable",
		});
		expect(detail.statusCode).toBe(503);
		await app.close();
	});

	it("returns typed search results and details", async () => {
		const service = fakeService();
		const app = Fastify();
		await registerCatalogueRoutes(app, { itemService: service });

		const search = await app.inject({
			method: "GET",
			url: "/api/catalogue/items?q=rope&isMagical=false",
		});
		const detail = await app.inject({
			method: "GET",
			url: "/api/catalogue/items/00000000-0000-4000-8000-000000000001",
		});

		expect(search.statusCode).toBe(200);
		expect(search.json()).toMatchObject({ readiness: "ready", items: [], total: 0 });
		expect(detail.statusCode).toBe(404);
		expect(service.searchItems).toHaveBeenCalledWith({ q: "rope", isMagical: false, limit: 50 });
		await app.close();
	});
});

function fakeService() {
	return {
		seedFoundrySrd2024Items: vi.fn<CatalogueItemService["seedFoundrySrd2024Items"]>(),
		searchItems: vi.fn<CatalogueItemService["searchItems"]>(async () => ({ items: [], total: 0 })),
		getItemDetails: vi.fn<CatalogueItemService["getItemDetails"]>(async () => null),
		getItemStatus: vi.fn<CatalogueItemService["getItemStatus"]>(),
		getStatus: vi.fn<CatalogueItemService["getStatus"]>(),
	};
}
