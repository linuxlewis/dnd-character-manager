import { ApiClientError } from "../../../generated/api-client.generated.js";

export function getInventoryErrorMessage(error: unknown) {
	if (error instanceof ApiClientError && error.status === 404)
		return "This character is no longer available.";
	return "Refresh the page to try again. Your other character details are still available.";
}

export function toInventoryError(error: unknown) {
	return error instanceof Error ? error : new Error("The inventory action could not be completed.");
}
