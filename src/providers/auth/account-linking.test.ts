import { describe, expect, it, vi } from "vitest";
import {
	handleAnonymousAccountLinked,
	registerAnonymousAccountLinkHandler,
	resetAnonymousAccountLinkHandlersForTest,
} from "./account-linking.js";

describe("anonymous account linking handlers", () => {
	it("notifies registered handlers and allows unregistering", async () => {
		resetAnonymousAccountLinkHandlersForTest();
		const handler = vi.fn();
		const unregister = registerAnonymousAccountLinkHandler(handler);

		await handleAnonymousAccountLinked({
			anonymousUserId: "anonymous-user",
			linkedUserId: "linked-user",
		});
		unregister();
		await handleAnonymousAccountLinked({
			anonymousUserId: "anonymous-user",
			linkedUserId: "linked-user",
		});

		expect(handler).toHaveBeenCalledOnce();
		expect(handler).toHaveBeenCalledWith({
			anonymousUserId: "anonymous-user",
			linkedUserId: "linked-user",
		});
	});
});
