import { describe, expect, it } from "vitest";
import {
	ListCharacterHistoryRequestSchema,
	ListCharacterHistoryResponseSchema,
} from "../types/index.js";
import { characterHistoryRouteContracts } from "./history-contract.js";

describe("character history route contract", () => {
	it("declares the authorized paginated history operation", () => {
		const [route] = characterHistoryRouteContracts;
		expect(route).toMatchObject({
			method: "get",
			operationId: "listCharacterHistory",
			path: "/api/characters/:characterId/history",
		});
		expect(route.queryParams).toBe(ListCharacterHistoryRequestSchema);
		expect(route.client).toMatchObject({
			functionName: "listCharacterHistory",
			queryParamsType: "ListCharacterHistoryRequest",
			responseType: "ListCharacterHistoryResponse",
			responseParser: "ListCharacterHistoryResponseSchema",
		});
	});

	it("keeps scope identifiers out of the public response schema", () => {
		const response = {
			entries: [],
			total: 0,
			limit: 20,
			offset: 0,
			hasMore: false,
		};
		expect(ListCharacterHistoryResponseSchema.parse(response)).toEqual(response);
		expect(() =>
			ListCharacterHistoryResponseSchema.parse({
				...response,
				entries: [{ inventoryScopeId: scopeId }],
			}),
		).toThrow();
	});
});

const scopeId = "00000000-0000-4000-8000-000000000001";
