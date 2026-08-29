import { describe, expect, it } from "vitest";
import { ApiClientError } from "../../../generated/api-client.generated.js";
import { getInventoryErrorMessage, toInventoryError } from "./inventory-errors.js";

describe("inventory errors", () => {
	it("keeps missing-character messaging distinct from transient failures", () => {
		expect(getInventoryErrorMessage(new ApiClientError(404, null))).toBe(
			"This character is no longer available.",
		);
		expect(getInventoryErrorMessage(new Error("temporary failure"))).toContain("Refresh the page");
	});

	it("normalizes unknown mutation failures", () => {
		expect(toInventoryError("failed")).toEqual(
			new Error("The inventory action could not be completed."),
		);
	});
});
