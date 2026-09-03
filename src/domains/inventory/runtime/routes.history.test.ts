import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { CharacterNotFoundError } from "../../characters/service/index.js";
import type { CharacterHistoryService } from "../service/index.js";
import type { RegisterCharacterHistoryRoutesOptions } from "./routes.history.js";
import { registerCharacterHistoryRoutes } from "./routes.history.js";

const userId = "00000000-0000-4000-8000-000000000001";
const characterId = "00000000-0000-4000-8000-000000000002";

describe("registerCharacterHistoryRoutes", () => {
	it("authenticates and forwards default and explicit query values", async () => {
		const service = fakeService();
		service.listCharacterHistory.mockResolvedValue({
			entries: [],
			total: 0,
			limit: 20,
			offset: 0,
			hasMore: false,
		});
		const app = await buildApp(service);

		try {
			const defaults = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/history`,
			});
			const explicit = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/history?limit=2&offset=4&action=item_added&entityType=item`,
			});

			expect(defaults.statusCode).toBe(200);
			expect(explicit.statusCode).toBe(200);
			expect(service.listCharacterHistory).toHaveBeenNthCalledWith(1, userId, characterId, {
				limit: 20,
				offset: 0,
			});
			expect(service.listCharacterHistory).toHaveBeenNthCalledWith(2, userId, characterId, {
				limit: 2,
				offset: 4,
				action: "item_added",
				entityType: "item",
			});
		} finally {
			await app.close();
		}
	});

	it.each([
		"limit=0",
		"limit=101",
		"limit=1.5",
		"offset=-1",
		"action=invalid",
		"entityType=invalid",
	])("rejects invalid query value %s before authentication or service calls", async (query) => {
		const service = fakeService();
		const getCurrentUser = vi.fn();
		const app = await buildApp(service, getCurrentUser);

		try {
			const response = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/history?${query}`,
			});
			expect(response.statusCode).toBe(400);
			expect(response.json()).toEqual({ error: "Invalid character history query." });
			expect(getCurrentUser).not.toHaveBeenCalled();
			expect(service.listCharacterHistory).not.toHaveBeenCalled();
		} finally {
			await app.close();
		}
	});

	it("maps authorization failures without querying history", async () => {
		const service = fakeService();
		service.listCharacterHistory.mockRejectedValue(new CharacterNotFoundError());
		const app = await buildApp(service);

		try {
			const response = await app.inject({
				method: "GET",
				url: `/api/characters/${characterId}/history`,
			});
			expect(response.statusCode).toBe(404);
			expect(response.json()).toEqual({ error: "Character not found." });
		} finally {
			await app.close();
		}
	});
});

async function buildApp(
	characterHistoryService: CharacterHistoryService,
	getCurrentUser: RegisterCharacterHistoryRoutesOptions["getCurrentUser"] = async () => ({
		user: { id: userId, isAnonymous: true, name: "Anonymous" },
	}),
) {
	const app = Fastify();
	await registerCharacterHistoryRoutes(app, { characterHistoryService, getCurrentUser });
	return app;
}

function fakeService() {
	return {
		listCharacterHistory: vi.fn(),
	} as unknown as CharacterHistoryService & {
		listCharacterHistory: ReturnType<typeof vi.fn>;
	};
}
