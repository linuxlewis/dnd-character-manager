import { describe, expect, it } from "vitest";
import type { Database } from "./character-attributes-repository-concurrency-helpers.js";
import {
	createReadGate,
	withReadGate,
} from "./character-attributes-repository-concurrency-helpers.js";

type FakeTransaction = {
	select: () => Promise<unknown>;
};
type TransactionCallback = (tx: FakeTransaction) => Promise<unknown>;

describe("character attributes read gate", () => {
	it("counts select invocations while preserving receiver binding and chaining", async () => {
		const gate = createReadGate(1);
		let reached = false;
		void gate.reached.then(
			() => {
				reached = true;
			},
			() => {
				reached = true;
			},
		);
		let receiver: FakeTransaction | undefined;
		let transactionReference: FakeTransaction | undefined;
		const database = createFakeDatabase(() => {
			const transaction: FakeTransaction = {
				select() {
					receiver = this;
					return Promise.resolve("selected");
				},
			};
			transactionReference = transaction;
			return transaction;
		});
		const wrapped = withReadGate(database, gate);

		const readPromise = transactionOf(wrapped)(async (tx) => {
			const assignedSelect = tx.select;
			void assignedSelect;
			await Promise.resolve();
			expect(reached).toBe(false);
			return tx.select();
		});

		await gate.reached;
		gate.release();
		await expect(readPromise).resolves.toBe("selected");
		expect(receiver).toBe(transactionReference);
	});

	it("does not count a captured select property read before gating the next invocation", async () => {
		const gate = createReadGate(2);
		let reached = false;
		void gate.reached.then(() => {
			reached = true;
		});
		let selectCalls = 0;
		const database = createFakeDatabase(() => ({
			select() {
				selectCalls += 1;
				return Promise.resolve(`selected-${selectCalls}`);
			},
		}));
		const wrapped = withReadGate(database, gate);

		const readPromise = transactionOf(wrapped)(async (tx) => {
			const assignedSelect = tx.select;
			void assignedSelect;
			expect(await tx.select()).toBe("selected-1");
			expect(reached).toBe(false);
			return tx.select();
		});

		try {
			await gate.reached;
			expect(reached).toBe(true);
		} finally {
			gate.release();
		}

		await expect(readPromise).resolves.toBe("selected-2");
	});

	it("counts captured database selects only when each select function is called", async () => {
		const gate = createReadGate(2);
		let reached = false;
		void gate.reached.then(() => {
			reached = true;
		});
		let selectCalls = 0;
		let receiver: object | undefined;
		const database = {
			select() {
				receiver = this;
				selectCalls += 1;
				return Promise.resolve(`selected-${selectCalls}`);
			},
		} as unknown as Database;
		const wrapped = withReadGate(database, gate);

		const assignedSelect = wrapped.select;
		void assignedSelect;
		expect(await wrapped.select()).toBe("selected-1");
		expect(reached).toBe(false);
		const secondRead = Promise.resolve(wrapped.select());

		try {
			await gate.reached;
			expect(reached).toBe(true);
		} finally {
			gate.release();
		}

		await expect(secondRead).resolves.toBe("selected-2");
		expect(receiver).toBe(database);
	});

	it("rejects the gate promptly when the selected query rejects", async () => {
		const gate = createReadGate(1);
		const error = new Error("query failed");
		const wrapped = withReadGate(
			createFakeDatabase(() => ({ select: () => Promise.reject(error) })),
			gate,
		);
		const readPromise = transactionOf(wrapped)(async (tx) => tx.select());

		await expect(gate.reached).rejects.toBe(error);
		await expect(readPromise).rejects.toBe(error);
		gate.release();
	});
});

function transactionOf(database: Database) {
	return (callback: TransactionCallback) =>
		database.transaction(callback as (tx: object) => Promise<unknown>);
}

function createFakeDatabase(createTransaction: () => FakeTransaction): Database {
	return {
		transaction: (callback: TransactionCallback) => callback(createTransaction()),
	} as unknown as Database;
}
