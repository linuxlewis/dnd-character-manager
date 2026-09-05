export type AsyncCleanup = () => void | Promise<void>;

export function createCleanupStack() {
	const cleanups: AsyncCleanup[] = [];
	let cleanupPromise: Promise<void> | undefined;

	return {
		add(cleanup: AsyncCleanup) {
			if (cleanupPromise) throw new Error("Cannot register cleanup after cleanup has started.");
			cleanups.push(cleanup);
		},

		run() {
			if (cleanupPromise) return cleanupPromise;
			cleanupPromise = runCleanups(cleanups);
			return cleanupPromise;
		},
	};
}

async function runCleanups(cleanups: AsyncCleanup[]) {
	let firstError: unknown;
	for (const cleanup of cleanups.reverse()) {
		try {
			await cleanup();
		} catch (error) {
			firstError ??= error;
		}
	}
	if (firstError) throw firstError;
}
