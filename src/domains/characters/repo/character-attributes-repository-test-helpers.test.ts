import type { PgTransactionConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import type { Database } from "./character-attributes-repository-test-helpers.js";
import {
	withTransactionFailure,
	withTransactionObserver,
} from "./character-attributes-repository-test-helpers.js";

describe("character attributes repository test helpers", () => {
	it("observes transaction configuration while forwarding the callback", async () => {
		const transaction = {};
		const database = createFakeDatabase(transaction);
		const config = { isolationLevel: "repeatable read" as const };
		let observed: unknown;
		let called = false;
		const wrapped = withTransactionObserver(database, (value) => {
			observed = value;
		});

		await invokeTransaction(wrapped, config, async (tx) => {
			called = true;
			expect(tx).toBe(transaction);
		});

		expect(called).toBe(true);
		expect(observed).toBe(config);
	});

	it("fails when the selected transaction method is invoked", async () => {
		const database = createFakeDatabase({
			insert: () => undefined,
		});
		const wrapped = withTransactionFailure(database, "insert");

		await expect(
			invokeTransaction(wrapped, undefined, async (tx) => {
				const insert = (tx as { insert: () => void }).insert;
				insert();
			}),
		).rejects.toThrow("Injected transaction failure");
	});

	it("fails only on the requested transaction method invocation", async () => {
		let insertCalls = 0;
		const database = createFakeDatabase({
			insert: () => {
				insertCalls += 1;
			},
		});
		const wrapped = withTransactionFailure(database, "insert", 2);

		await expect(
			invokeTransaction(wrapped, undefined, async (tx) => {
				(tx as { insert: () => void }).insert();
				(tx as { insert: () => void }).insert();
			}),
		).rejects.toThrow("Injected transaction failure");
		expect(insertCalls).toBe(1);
	});
});

function createFakeDatabase(transaction: object): Database {
	return {
		transaction: (callback: (tx: object) => Promise<unknown>) => callback(transaction),
	} as unknown as Database;
}

function invokeTransaction(
	database: Database,
	config: PgTransactionConfig | undefined,
	callback: (tx: object) => Promise<unknown>,
) {
	return database.transaction(callback, config);
}
