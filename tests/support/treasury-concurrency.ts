import {
	CharacterTreasuryPreconditionError,
	createCharacterTreasuryRepository,
} from "@domains/inventory/repo/index.js";
import type { CurrencyBalance } from "@domains/inventory/types/index.js";
import { expect, vi } from "vitest";

export async function testConcurrentPrecondition(characterId: string) {
	const repository = createCharacterTreasuryRepository();
	const zero = { cp: 0, sp: 0, gp: 0, pp: 0 } satisfies CurrencyBalance;
	const expectedPrevious = { cp: 10, sp: 0, gp: 0, pp: 0 } satisfies CurrencyBalance;
	await repository.mutateCharacterTreasury(characterId, () => expectedPrevious, {
		expectedPrevious: zero,
	});

	const addTwo = vi.fn((current: CurrencyBalance) => ({ ...current, cp: current.cp + 2 }));
	const addThree = vi.fn((current: CurrencyBalance) => ({ ...current, cp: current.cp + 3 }));
	const results = await Promise.allSettled([
		repository.mutateCharacterTreasury(characterId, addTwo, { expectedPrevious }),
		repository.mutateCharacterTreasury(characterId, addThree, { expectedPrevious }),
	]);

	expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
	const rejected = results.find((result) => result.status === "rejected");
	const fulfilled = results.find((result) => result.status === "fulfilled");
	if (
		!rejected ||
		rejected.status !== "rejected" ||
		!fulfilled ||
		fulfilled.status !== "fulfilled"
	) {
		throw new Error("Concurrent treasury mutations did not settle as expected.");
	}
	expect(rejected.reason).toBeInstanceOf(CharacterTreasuryPreconditionError);
	const rejectedMutation = results.indexOf(rejected) === 0 ? addTwo : addThree;
	expect(rejectedMutation).not.toHaveBeenCalled();
	expect(addTwo.mock.calls.length + addThree.mock.calls.length).toBe(1);

	const persisted = await repository.findCharacterTreasury(characterId);
	expect(persisted).toEqual(fulfilled.value);
	expect([12, 13]).toContain(persisted.balances.cp);
}
