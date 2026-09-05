import { describe, expect, it, vi } from "vitest";
import { createCleanupStack } from "./cleanup-stack.js";

describe("createCleanupStack", () => {
	it("runs registered cleanup in reverse order and only once", async () => {
		const calls: string[] = [];
		const cleanup = createCleanupStack();
		cleanup.add(() => {
			calls.push("fixture");
		});
		cleanup.add(async () => {
			await Promise.resolve();
			calls.push("stack");
		});

		const first = cleanup.run();
		const second = cleanup.run();
		await Promise.all([first, second]);

		expect(calls).toEqual(["stack", "fixture"]);
	});

	it("attempts every cleanup and reports the first failure", async () => {
		const cleanup = createCleanupStack();
		const failingCleanup = vi.fn(() => {
			throw new Error("fixture close failed");
		});
		const finalCleanup = vi.fn();
		cleanup.add(finalCleanup);
		cleanup.add(failingCleanup);

		await expect(cleanup.run()).rejects.toThrow("fixture close failed");
		expect(failingCleanup).toHaveBeenCalledOnce();
		expect(finalCleanup).toHaveBeenCalledOnce();
	});
});
