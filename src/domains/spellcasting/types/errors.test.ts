import { expect, it } from "vitest";
import {
	SpellSearchUnavailableError,
	SpellSlotDefaultsUnavailableError,
	SpellSlotUnavailableError,
} from "./errors.js";

it("retains public spell failure messages", () => {
	expect(new SpellSlotDefaultsUnavailableError().message).toBe(
		"D&D spell slot defaults could not be loaded.",
	);
	expect(new SpellSearchUnavailableError().message).toBe("D&D spells could not be loaded.");
	expect(new SpellSlotUnavailableError("No spell slots remain.").message).toBe(
		"No spell slots remain.",
	);
});
