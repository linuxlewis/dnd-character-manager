import type { getDb } from "@providers/database/index.js";

export type Database = ReturnType<typeof getDb>;
type QueryCallback = (value: unknown) => unknown;
type GateState = "open" | "released" | "failed";

export interface ReadGate {
	selectNumber: number;
	reached: Promise<void>;
	release: () => void;
	fail: (reason: unknown) => void;
	pause: () => Promise<void>;
}

const activeReadGates = new Set<ReadGate>();

export function createReadGate(selectNumber: number): ReadGate {
	let resolveReached: () => void = () => undefined;
	let rejectReached: (reason: unknown) => void = () => undefined;
	let resolveReleased: () => void = () => undefined;
	let state: GateState = "open";
	let failure: unknown;
	const reached = new Promise<void>((resolve, reject) => {
		resolveReached = resolve;
		rejectReached = reject;
	});
	const released = new Promise<void>((resolve) => {
		resolveReleased = resolve;
	});

	const gate: ReadGate = {
		selectNumber,
		reached,
		release: () => {
			if (state !== "open") return;
			state = "released";
			resolveReleased();
			activeReadGates.delete(gate);
		},
		fail: (reason) => {
			if (state !== "open") return;
			state = "failed";
			failure = reason;
			rejectReached(reason);
			resolveReleased();
			activeReadGates.delete(gate);
		},
		pause: async () => {
			if (state === "open") resolveReached();
			await released;
			if (state === "failed") throw failure;
		},
	};
	activeReadGates.add(gate);
	return gate;
}

export function releaseActiveReadGates() {
	for (const gate of activeReadGates) gate.release();
}

// Drizzle query builders are thenables, so pause after a selected result is available.
export function withReadGate(database: Database, gate: ReadGate): Database {
	let selectCount = 0;

	const wrapSelect =
		(target: object, member: (...args: unknown[]) => unknown) =>
		(...args: unknown[]) => {
			selectCount += 1;
			return wrap(Reflect.apply(member, target, args) as object, selectCount === gate.selectNumber);
		};

	const wrap = (value: object, shouldPause = false): object =>
		new Proxy(value, {
			get(target, property, receiver) {
				const member = Reflect.get(target, property, receiver);
				if (property === "then" && typeof member === "function") {
					return (onFulfilled?: QueryCallback, onRejected?: QueryCallback) =>
						Reflect.apply(member, target, [
							async (result: unknown) => {
								if (shouldPause) await gate.pause();
								return onFulfilled ? onFulfilled(result) : result;
							},
							(error: unknown) => {
								if (shouldPause) gate.fail(error);
								return onRejected ? onRejected(error) : Promise.reject(error);
							},
						]);
				}
				if (property === "select" && typeof member === "function") {
					return wrapSelect(target, member);
				}
				if (typeof member !== "function") return member;
				return (...args: unknown[]) => wrap(Reflect.apply(member, target, args), shouldPause);
			},
		});

	return new Proxy(database, {
		get(target, property, receiver) {
			const member = Reflect.get(target, property, receiver);
			if (property === "transaction" && typeof member === "function") {
				return (callback: (tx: object) => Promise<unknown>, config: unknown) =>
					Reflect.apply(member, target, [(tx: object) => callback(wrap(tx)), config]);
			}
			if (property === "select" && typeof member === "function") {
				return wrapSelect(target, member);
			}
			return member;
		},
	}) as Database;
}
