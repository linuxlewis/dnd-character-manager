export function assertE2eCatalogueCanBeConfigured(e2eRequested: boolean, stackRunning: boolean) {
	if (e2eRequested && stackRunning) {
		throw new Error(
			"Deterministic e2e catalogue data cannot be attached to an already-running stack. Run `pnpm stop` for this worktree, then rerun `pnpm test:e2e`; unrelated stacks are not touched.",
		);
	}
}
