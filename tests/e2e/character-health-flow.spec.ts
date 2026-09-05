import { expect, test } from "@playwright/test";
import { mockCharacterSpellApi } from "../support/character-spell-api.js";
import { openSpellsAndAbilitiesTab } from "./character-detail-helpers.js";

const spellApiTimeoutMs = 30_000;

test("creates a character and tracks health changes on detail", async ({ page }) => {
	await page.goto("/");

	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Mira");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Fighter" }).click();
	await page.getByLabel("Level").fill("3");
	await page.getByRole("button", { name: "Create character" }).click();

	await expect(page.getByRole("heading", { name: "Mira" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Attributes & Rolls", exact: true })).toHaveAttribute(
		"aria-current",
		"page",
	);
	await expect(page.getByRole("link", { name: "Spells & Abilities", exact: true })).toBeVisible();
	await expect(page.getByTestId("personal-inventory")).toHaveCount(0);
	await expect(page.getByText("10 / 10 HP (Temp HP 0)")).toBeVisible();
	await expect(page.getByText("HP +5, Temp HP +5")).toBeHidden();

	await page.getByRole("button", { exact: true, name: "Edit" }).click();
	const healthDialog = page.getByRole("dialog", { name: "Edit health" });
	await expect(healthDialog.getByLabel("Max HP")).toHaveCSS("font-size", "16px");
	await expect(healthDialog.getByLabel("Temp HP")).toHaveCSS("font-size", "16px");
	await healthDialog.getByLabel("Temp HP").fill("5");
	await healthDialog.getByRole("button", { exact: true, name: "Save" }).click();
	await expect(page.getByText("15 / 15 HP (Temp HP +5)")).toBeVisible();

	await page.getByRole("button", { name: /^History \(/ }).click();
	await expect(page.getByText("HP +5, Temp HP +5")).toBeVisible();

	await page.getByRole("button", { name: "Heal" }).click();
	await expect(page.getByLabel("Amount")).toBeFocused();
	await expect(page.getByLabel("Amount")).toHaveCSS("font-size", "16px");
	await page.getByRole("button", { name: "Cancel" }).click();

	await page.getByRole("button", { name: "Damage" }).click();
	const damageDialog = page.getByRole("dialog", { name: "Damage" });
	await expect(damageDialog.getByLabel("Amount")).toBeFocused();
	await expect(damageDialog.getByLabel("Amount")).toHaveCSS("font-size", "16px");
	await damageDialog.getByLabel("Amount").fill("4");
	await damageDialog.getByRole("button", { exact: true, name: "Save" }).click();
	await expect(page.getByText("11 / 15 HP (Temp HP +5)")).toBeVisible();
	await expect(page.getByText("HP -4")).toBeVisible();

	await page.getByRole("button", { exact: true, name: "Edit" }).click();
	await page.getByLabel("Max HP").fill("20");
	await page
		.getByRole("dialog", { name: "Edit health" })
		.getByRole("button", { exact: true, name: "Save" })
		.click();
	await expect(page.getByText("21 / 25 HP (Temp HP +5)")).toBeVisible();
	await expect(page.getByText("HP +10, Max HP +10")).toBeVisible();

	await page.reload();
	await page.getByText("Back to characters").click();
	await page.getByRole("link", { name: "Mira" }).click();
	await expect(page.getByText("21 / 25 HP (Temp HP +5)")).toBeVisible();
	await expect(page.getByText("HP +10, Max HP +10")).toBeHidden();
	await page.getByRole("button", { name: /^History \(/ }).click();
	await expect(page.getByText("HP +10, Max HP +10")).toBeVisible();
});

test("configures spell slots and tracks spell usage on detail", async ({ page }) => {
	test.setTimeout(120_000);
	await mockCharacterSpellApi(page);
	await page.goto("/");

	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Tamsin");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard" }).click();
	await page.getByLabel("Level").fill("7");
	await page.getByRole("button", { name: "Create character" }).click();

	await expect(page.getByRole("heading", { name: "Tamsin" })).toBeVisible();
	await openSpellsAndAbilitiesTab(page);
	await expect(page.getByRole("heading", { name: "Spell slots" })).toBeVisible();
	await expect(page.getByText("Cantrips & features")).toBeVisible();
	await expect(page.getByText("0 / 0 remaining").first()).toBeHidden();
	await expect(page.getByLabel("1st-level slot total")).toBeHidden();

	await page.getByRole("button", { name: "Add cantrip or feature" }).click();
	await expect(page.getByRole("dialog", { name: "Add cantrip or feature" })).toBeVisible();
	await page.getByLabel("Search cantrips and features").fill("light");
	await expect(page.getByRole("button", { name: /^Light\b/ })).toBeVisible({
		timeout: spellApiTimeoutMs,
	});
	await page.getByRole("button", { name: /^Light\b/ }).click();
	await expect(page.getByRole("dialog", { name: "Add cantrip or feature" })).toBeHidden({
		timeout: spellApiTimeoutMs,
	});
	await expect(page.getByRole("button", { name: "View Light details" })).toBeVisible();
	await expect(page.getByText("Cantrip", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Add cantrip or feature" }).click();
	await page.getByLabel("Search cantrips and features").fill("lay on hands");
	await expect(page.getByRole("button", { name: /^Lay on Hands\b/ })).toBeVisible({
		timeout: spellApiTimeoutMs,
	});
	await page.getByRole("button", { name: /^Lay on Hands\b/ }).click();
	await expect(page.getByRole("dialog", { name: "Add cantrip or feature" })).toBeHidden({
		timeout: spellApiTimeoutMs,
	});
	await expect(page.getByRole("button", { name: "View Lay on Hands details" })).toBeVisible();
	await expect(page.getByText("1st-level feature")).toBeVisible();

	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("No spell slot changes yet.")).toBeVisible();
	await page.getByRole("button", { name: /Spell history/ }).click();

	await page.getByRole("button", { name: "Edit spells" }).click();
	await expect(page.getByLabel("1st-level slot total")).toHaveCSS("font-size", "16px");
	await page.getByLabel("1st-level slot total").fill("2");
	await page.getByRole("button", { name: "Apply changes" }).click();
	await expect(page.getByText("2 / 2 remaining")).toBeVisible();
	await expect(
		page.getByRole("progressbar", { name: "1st-level spell slots: 2 of 2 remaining" }),
	).toHaveAttribute("aria-valuenow", "100");
	await expect(page.getByRole("button", { name: "Add spell to 3rd-level" })).toBeHidden();
	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("Configured 1st-level: 2 slots")).toBeVisible();
	const historyBox = await page.getByText("Configured 1st-level: 2 slots").boundingBox();
	const firstSlotBox = await page.getByText("2 / 2 remaining").boundingBox();
	expect(historyBox?.y ?? 0).toBeLessThan(firstSlotBox?.y ?? 0);
	await page.getByRole("button", { name: /Spell history/ }).click();

	await page.getByRole("button", { name: "Edit spells" }).click();
	await page.getByRole("button", { name: "Add spell to 3rd-level" }).click();
	let addSpellDialog = page.getByRole("dialog", { name: "Add spell to 3rd-level" });
	await expect(addSpellDialog).toBeVisible();
	await expect(
		addSpellDialog.getByRole("button", { name: "Close add spell dialog" }),
	).toBeVisible();
	let closeButtonBox = await addSpellDialog
		.getByRole("button", { name: "Close add spell dialog" })
		.boundingBox();
	expect(closeButtonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
	expect(closeButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
	await expect(page.getByLabel("Search spells")).toBeFocused();
	await expect(page.getByLabel("Search spells")).toHaveCSS("font-size", "16px");
	await page.getByLabel("Search spells").fill("divine smite");
	await expect(page.getByRole("button", { name: /^Divine Smite\b/ })).toBeVisible({
		timeout: spellApiTimeoutMs,
	});
	await page.getByRole("button", { name: /^Divine Smite\b/ }).click();
	await expect(page.getByRole("dialog", { name: "Add spell to 3rd-level" })).toBeHidden({
		timeout: spellApiTimeoutMs,
	});
	await expect(page.getByRole("button", { name: "View Divine Smite details" })).toBeVisible();
	await expect(page.getByText("1st-level spell")).toBeVisible();
	await expect(page.getByRole("button", { name: "Remove Divine Smite" })).toBeVisible();
	await page.getByRole("button", { name: "Done" }).click();
	await expect(page.getByRole("button", { name: "Remove Divine Smite" })).toBeHidden();
	await page.getByRole("button", { name: "Add spell to 3rd-level" }).click();
	addSpellDialog = page.getByRole("dialog", { name: "Add spell to 3rd-level" });
	await expect(addSpellDialog).toBeVisible();
	await expect(
		addSpellDialog.getByRole("button", { name: "Close add spell dialog" }),
	).toBeVisible();
	closeButtonBox = await addSpellDialog
		.getByRole("button", { name: "Close add spell dialog" })
		.boundingBox();
	expect(closeButtonBox?.width ?? 0).toBeGreaterThanOrEqual(44);
	expect(closeButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
	await expect(page.getByLabel("Search spells")).toBeFocused();
	await expect(page.getByLabel("Search spells")).toHaveCSS("font-size", "16px");
	await addSpellDialog.getByRole("button", { name: "Close add spell dialog" }).click();
	await expect(addSpellDialog).toBeHidden();
	await page.getByRole("button", { name: "View Divine Smite details" }).click();
	const spellDetailsDialog = page.getByRole("dialog", {
		name: /^(Divine Smite|Spell details)$/,
	});
	await expect(spellDetailsDialog).toBeVisible();
	await expect(page.getByText("Spell 1st-level")).toBeVisible({ timeout: spellApiTimeoutMs });
	await expect(page.getByRole("dialog", { name: "Divine Smite" })).toBeVisible();
	await expect(page.getByText(/radiant damage/i)).toBeVisible({ timeout: spellApiTimeoutMs });
	await page.keyboard.press("Escape");
	await expect(spellDetailsDialog).toBeHidden();

	await page.getByRole("button", { name: "Edit spells" }).click();
	await page.getByRole("button", { name: "Remove Divine Smite" }).click();
	await expect(page.getByRole("dialog", { name: "Remove Divine Smite?" })).toBeVisible();
	await page.getByRole("button", { name: "Cancel" }).click();
	await expect(page.getByRole("button", { name: "View Divine Smite details" })).toBeVisible();
	await page.getByRole("button", { name: "Remove Divine Smite" }).click();
	await page.getByRole("button", { name: "Remove spell" }).click();
	await expect(page.getByRole("button", { name: "View Divine Smite details" })).toBeHidden();
	await expect(page.getByText("1st-level spell")).toBeHidden();
	await page.getByRole("button", { name: "Add spell to 3rd-level" }).click();
	addSpellDialog = page.getByRole("dialog", { name: "Add spell to 3rd-level" });
	await page.getByLabel("Search spells").fill("divine smite");
	await expect(page.getByRole("button", { name: /^Divine Smite\b/ })).toBeVisible({
		timeout: spellApiTimeoutMs,
	});
	await page.getByRole("button", { name: /^Divine Smite\b/ }).click();
	await expect(addSpellDialog).toBeHidden({ timeout: spellApiTimeoutMs });
	await page.getByRole("button", { name: "Done" }).click();
	await expect(page.getByRole("button", { name: "Remove Divine Smite" })).toBeHidden();

	await page.getByRole("button", { name: "Use 1st-level" }).click();
	await expect(page.getByText("1 / 2 remaining")).toBeVisible();
	await expect(
		page.getByRole("progressbar", { name: "1st-level spell slots: 1 of 2 remaining" }),
	).toHaveAttribute("aria-valuenow", "50");

	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("Used 1st-level slot")).toBeVisible();

	await page.getByRole("button", { name: "Restore 1st-level" }).click();
	await expect(page.getByText("2 / 2 remaining")).toBeVisible();
	await expect(
		page.getByRole("progressbar", { name: "1st-level spell slots: 2 of 2 remaining" }),
	).toHaveAttribute("aria-valuenow", "100");
	await expect(page.getByText("Restored 1st-level slot")).toBeVisible();

	await page.reload();
	await expect(page.getByText("2 / 2 remaining")).toBeVisible();
	await expect(page.getByText("Light")).toBeVisible();
	await expect(page.getByText("Lay on Hands")).toBeVisible();
	await expect(page.getByText("Divine Smite")).toBeVisible();
	await expect(page.getByText("Restored 1st-level slot")).toBeHidden();
	await page.getByRole("button", { name: /Spell history/ }).click();
	await expect(page.getByText("Restored 1st-level slot")).toBeVisible();
});

test("keeps spell query recovery separate from repeatable spell actions", async ({ page }) => {
	let spellSlotsGetFailures = 1;
	let spellsGetFailures = 1;
	let searchFailures = 1;
	let detailFailures = 1;
	let saveFailures = 1;
	let removeFailures = 1;
	let slotUpdateFailures = 1;
	await mockCharacterSpellApi(page);
	await page.route("**/api/characters/*/spell-slots**", async (route) => {
		const request = route.request();
		const pathname = new URL(request.url()).pathname;
		if (
			request.method() === "GET" &&
			pathname.endsWith("/spell-slots") &&
			spellSlotsGetFailures > 0
		) {
			spellSlotsGetFailures -= 1;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Spell slots are temporarily unavailable." }),
			});
			return;
		}
		if (request.method() === "PUT" && pathname.endsWith("/spell-slots") && slotUpdateFailures > 0) {
			slotUpdateFailures -= 1;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Spell slot save failed." }),
			});
			return;
		}
		await route.continue();
	});
	await page.route("**/api/characters/*/spells**", async (route) => {
		const request = route.request();
		const pathname = new URL(request.url()).pathname;
		if (request.method() === "GET" && pathname.endsWith("/spells") && spellsGetFailures > 0) {
			spellsGetFailures -= 1;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Saved spells are temporarily unavailable." }),
			});
			return;
		}
		if (request.method() === "POST" && pathname.endsWith("/spells/search") && searchFailures > 0) {
			searchFailures -= 1;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Spell search failed." }),
			});
			return;
		}
		if (request.method() === "GET" && pathname.match(/\/spells\/[^/]+$/) && detailFailures > 0) {
			detailFailures -= 1;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Spell details failed." }),
			});
			return;
		}
		if (request.method() === "POST" && pathname.endsWith("/spells") && saveFailures > 0) {
			saveFailures -= 1;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Spell save failed." }),
			});
			return;
		}
		if (request.method() === "DELETE" && pathname.match(/\/spells\/[^/]+$/) && removeFailures > 0) {
			removeFailures -= 1;
			await route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Spell removal failed." }),
			});
			return;
		}
		await route.fallback();
	});

	await page.goto("/characters/new/");
	await page.getByLabel("Name").fill("Spell Recovery");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard" }).click();
	await page.getByLabel("Level").fill("7");
	await page.getByRole("button", { name: "Create character" }).click();
	await openSpellsAndAbilitiesTab(page);

	await expect(page.getByText("Spell slots unavailable")).toBeVisible();
	await expect(page.getByText("Spells unavailable")).toBeVisible();
	await page.getByRole("button", { name: "Retry spell slots" }).click();
	await expect(page.getByText("Spell slots unavailable")).toBeHidden();
	await expect(page.getByText("Spells unavailable")).toBeVisible();
	await page.getByRole("button", { name: "Retry spells" }).click();
	await expect(page.getByText("Spells unavailable")).toBeHidden();

	await page.getByRole("button", { name: "Edit spells" }).click();
	await page.getByLabel("1st-level slot total").fill("2");
	await page.getByRole("button", { name: "Apply changes" }).click();
	await expect(page.getByText("Spell slot action failed")).toBeVisible();
	await expect(page.getByText("Spell slots unavailable")).toBeHidden();
	await page.getByRole("button", { name: "Apply changes" }).click();
	await expect(page.getByText("Spell slot action failed")).toBeHidden();

	await page.getByRole("button", { name: "Add cantrip or feature" }).click();
	await page.getByLabel("Search cantrips and features").fill("light");
	await expect(page.getByText("Spell search unavailable")).toBeVisible({
		timeout: spellApiTimeoutMs,
	});
	await expect(page.getByText("Spells unavailable")).toBeHidden();
	await page.getByRole("button", { name: "Retry search" }).click();
	await expect(page.getByRole("button", { name: /^Light\b/ })).toBeVisible({
		timeout: spellApiTimeoutMs,
	});
	await page.getByRole("button", { name: /^Light\b/ }).click();
	await expect(page.getByText("Spell could not be saved")).toBeVisible();
	await expect(page.getByText("Spells unavailable")).toBeHidden();
	await page.getByRole("button", { name: /^Light\b/ }).click();
	await expect(page.getByRole("dialog", { name: "Add cantrip or feature" })).toBeHidden({
		timeout: spellApiTimeoutMs,
	});

	await page.getByRole("button", { name: "View Light details" }).click();
	await expect(page.getByText("Spell details unavailable")).toBeVisible();
	await expect(page.getByText("Spells unavailable")).toBeHidden();
	await page.getByRole("button", { name: "Retry spell details" }).click();
	await expect(page.getByText("Spell cantrip")).toBeVisible({
		timeout: spellApiTimeoutMs,
	});
	await page.keyboard.press("Escape");

	await page.getByRole("button", { name: "Edit spells" }).click();
	await page.getByRole("button", { name: "Remove Light" }).click();
	await page.getByRole("button", { name: "Remove spell" }).click();
	await expect(page.getByText("Spell could not be removed")).toBeVisible();
	await expect(page.getByText("Spells unavailable")).toBeHidden();
	await page.getByRole("button", { name: "Remove spell" }).click();
	await expect(page.getByRole("button", { name: "View Light details" })).toBeHidden();
});
