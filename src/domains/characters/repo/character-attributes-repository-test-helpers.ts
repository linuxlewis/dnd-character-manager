import type { getDb } from "@providers/database/index.js";

export type Database = ReturnType<typeof getDb>;

export function withTransactionObserver(
	database: Database,
	onTransaction: (config: unknown) => void,
): Database {
	return new Proxy(database, {
		get(target, property, receiver) {
			const member = Reflect.get(target, property, receiver);
			if (property !== "transaction" || typeof member !== "function") return member;
			return (callback: (tx: object) => Promise<unknown>, config: unknown) => {
				onTransaction(config);
				return Reflect.apply(member, target, [callback, config]);
			};
		},
	}) as Database;
}

export function withTransactionFailure(
	database: Database,
	propertyToFail: string,
	failureInvocation = 1,
): Database {
	const failure = new Error(`Injected transaction failure at ${propertyToFail}.`);
	let invocation = 0;
	return new Proxy(database, {
		get(target, property, receiver) {
			const member = Reflect.get(target, property, receiver);
			if (property !== "transaction" || typeof member !== "function") return member;
			return (callback: (tx: object) => Promise<unknown>, config: unknown) =>
				Reflect.apply(member, target, [
					(tx: object) =>
						callback(
							new Proxy(tx, {
								get(txTarget, txProperty, txReceiver) {
									const txMember = Reflect.get(txTarget, txProperty, txReceiver);
									if (txProperty === propertyToFail && typeof txMember === "function") {
										invocation += 1;
										if (invocation !== failureInvocation) {
											return (...args: unknown[]) => Reflect.apply(txMember, txTarget, args);
										}
										return () => {
											throw failure;
										};
									}
									if (typeof txMember !== "function") return txMember;
									return (...args: unknown[]) => Reflect.apply(txMember, txTarget, args);
								},
							}),
						),
					config,
				]);
		},
	}) as Database;
}
