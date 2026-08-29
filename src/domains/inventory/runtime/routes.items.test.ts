import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import type { CharacterItemService } from "../service/index.js";
import {
	CatalogueItemNotFoundError,
	CatalogueItemUnavailableError,
	CharacterItemNotFoundError,
	CharacterItemPersistenceError,
} from "../service/index.js";
import { registerCharacterItemRoutes } from "./routes.items.js";

const userId = "00000000-0000-4000-8000-000000000001";
const characterId = "00000000-0000-4000-8000-000000000002";
const otherCharacterId = "00000000-0000-4000-8000-000000000003";
const itemId = "00000000-0000-4000-8000-000000000004";

describe("registerCharacterItemRoutes", () => {
	it("authenticates and forwards CRUD, filters, and equipment operations", async () => {
		const service = fakeService();
		const response = { item: { id: itemId } };
		service.createCharacterItem.mockResolvedValue(response as never);
		service.listCharacterItems.mockResolvedValue({ items: [], total: 0 });
		service.getCharacterItem.mockResolvedValue(response as never);
		service.updateCharacterItem.mockResolvedValue(response as never);
		service.deleteCharacterItem.mockResolvedValue(undefined);
		service.equipCharacterItem.mockResolvedValue(response as never);
		service.unequipCharacterItem.mockResolvedValue(response as never);
		const app = await buildApp(service);

		try {
			const create = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/items`,
				payload: { name: "Rope", type: "misc", category: "Gear", properties: {} },
			});
			const list = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/items?search=rope&type=misc&isEquipped=false`,
			});
			const detail = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/items/${itemId}`,
			});
			const update = await app.inject({
				method: "PATCH",
				url: `/api/characters/${characterId}/items/${itemId}`,
				payload: { notes: "Travel gear", properties: {} },
			});
			const remove = await app.inject({
				method: "DELETE",
				url: `/api/characters/${characterId}/items/${itemId}`,
			});
			const equip = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/items/${itemId}/equip`,
			});
			const unequip = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/items/${itemId}/unequip`,
			});

			expect(create.statusCode).toBe(201);
			expect(list.statusCode).toBe(200);
			expect(detail.statusCode).toBe(200);
			expect(update.statusCode).toBe(200);
			expect(remove.statusCode).toBe(204);
			expect(equip.statusCode).toBe(200);
			expect(unequip.statusCode).toBe(200);
			expect(service.listCharacterItems).toHaveBeenCalledWith(userId, characterId, {
				search: "rope",
				type: "misc",
				isEquipped: false,
			});
			expect(service.updateCharacterItem).toHaveBeenCalledWith(userId, characterId, itemId, {
				notes: "Travel gear",
				properties: {},
			});
		} finally {
			await app.close();
		}
	});

	it("rejects malformed input before authentication or service calls", async () => {
		const service = fakeService();
		const app = await buildApp(service);

		try {
			const invalidPath = await app.inject({
				method: "GET",
				url: "/api/characters/not-a-uuid/items",
			});
			const invalidBody = await app.inject({
				method: "POST",
				url: `/api/characters/${characterId}/items`,
				payload: { name: "", type: "misc", category: "Gear" },
			});
			expect(invalidPath.statusCode).toBe(400);
			expect(invalidBody.statusCode).toBe(400);
			expect(service.listCharacterItems).not.toHaveBeenCalled();
			expect(service.createCharacterItem).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it.each([
		[new CharacterNotFoundError(), 404],
		[new CharacterItemNotFoundError(), 404],
		[new CatalogueItemNotFoundError(), 404],
		[new CatalogueItemUnavailableError(), 503],
		[new CharacterItemPersistenceError(), 500],
	] as const)("maps %s to HTTP %s without leaking cross-character items", async (error, status) => {
		const service = fakeService();
		service.getCharacterItem.mockRejectedValue(error);
		const app = await buildApp(service);

		try {
			const response = await app.inject({
				method: "GET",
				url: `/api/characters/${otherCharacterId}/items/${itemId}`,
			});
			expect(response.statusCode).toBe(status);
			expect(response.json().error).toBeTypeOf("string");
			expect(service.getCharacterItem).toHaveBeenCalledWith(userId, otherCharacterId, itemId);
		} finally {
			await app.close();
		}
	});
});

async function buildApp(characterItemService: CharacterItemService) {
	const app = Fastify();
	await registerCharacterItemRoutes(app, {
		characterItemService,
		getCurrentUser: async () => ({
			user: { id: userId, isAnonymous: true, name: "Anonymous" },
		}),
	});
	return app;
}

function fakeService() {
	return {
		createCharacterItem: vi.fn(),
		listCharacterItems: vi.fn(),
		getCharacterItem: vi.fn(),
		updateCharacterItem: vi.fn(),
		deleteCharacterItem: vi.fn(),
		equipCharacterItem: vi.fn(),
		unequipCharacterItem: vi.fn(),
	} as unknown as CharacterItemService & {
		createCharacterItem: ReturnType<typeof vi.fn>;
		listCharacterItems: ReturnType<typeof vi.fn>;
		getCharacterItem: ReturnType<typeof vi.fn>;
		updateCharacterItem: ReturnType<typeof vi.fn>;
		deleteCharacterItem: ReturnType<typeof vi.fn>;
		equipCharacterItem: ReturnType<typeof vi.fn>;
		unequipCharacterItem: ReturnType<typeof vi.fn>;
	};
}
