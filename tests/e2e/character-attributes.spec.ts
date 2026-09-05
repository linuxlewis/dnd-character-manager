import { expect, type Page, test } from "@playwright/test";

test("completes the attributes reference journey and preserves ownership boundaries", async ({
	browser,
	page,
}) => {
	await page.goto("/");
	await createCharacter(page, "Attributes Journey", "Fighter", 1);

	const characterPath = new URL(page.url()).pathname;
	await expect(page.getByRole("link", { name: "Attributes & Rolls", exact: true })).toHaveAttribute(
		"aria-current",
		"page",
	);
	await expect(page.locator("#character-section-attributes")).toHaveAttribute(
		"aria-labelledby",
		"character-section-attributes-heading",
	);
	for (const ability of [
		"Strength",
		"Dexterity",
		"Constitution",
		"Intelligence",
		"Wisdom",
		"Charisma",
	]) {
		await expect(page.getByTestId(`ability-row-${ability.toLowerCase()}`)).toContainText("10");
		await expect(page.getByTestId(`ability-row-${ability.toLowerCase()}`)).toContainText("+0");
	}
	await expect(page.getByText("Proficiency bonus").locator("..")).toContainText("+2");

	const activeSectionRequests: string[] = [];
	page.on("request", (request) => {
		if (request.url().includes("/api/")) activeSectionRequests.push(request.url());
	});
	await page.goto(characterPath);
	await expect(page.getByRole("heading", { name: "Attributes & Rolls" })).toBeVisible();
	await expect
		.poll(() => activeSectionRequests.some((url) => url.includes("/attributes")))
		.toBe(true);
	expect(activeSectionRequests.some((url) => url.includes("/spell"))).toBe(false);
	expect(activeSectionRequests.some((url) => url.includes("/items"))).toBe(false);

	activeSectionRequests.length = 0;
	await page.getByRole("link", { name: "Spells & Abilities", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Spell slots" })).toBeVisible();
	await expect(page.locator("#character-section-spells-heading")).toBeFocused();
	expect(activeSectionRequests.some((url) => url.includes("/spell"))).toBe(true);
	expect(activeSectionRequests.some((url) => url.includes("/items"))).toBe(false);
	await page.getByRole("link", { name: "Attributes & Rolls", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Attributes & Rolls" })).toBeVisible();

	await page.getByRole("button", { name: "Edit attributes" }).click();
	let editor = page.getByRole("dialog", { name: "Edit attributes" });
	await editor.getByRole("textbox", { name: "Dexterity" }).fill("");
	await editor.getByRole("button", { name: "Save changes" }).click();
	await expect(editor.getByText("Score must be a whole number from 1 to 30")).toBeVisible();
	await editor.getByRole("button", { name: "Cancel" }).click();
	await page.getByRole("button", { name: "Edit attributes" }).click();
	await expect(page.getByText("Score must be a whole number from 1 to 30")).toHaveCount(0);
	await page
		.getByRole("dialog", { name: "Edit attributes" })
		.getByRole("button", { name: "Cancel" })
		.click();
	await page.getByRole("button", { name: "Edit attributes" }).click();
	editor = page.getByRole("dialog", { name: "Edit attributes" });
	await editor.getByRole("textbox", { name: "Dexterity" }).fill("16");
	await editor.getByRole("textbox", { name: "Wisdom" }).fill("14");
	await editor.getByLabel("Stealth").click();
	await page.getByRole("option", { name: "Expertise" }).click();
	await editor.getByLabel("Perception").click();
	await page.getByRole("option", { name: "Proficient" }).click();
	await editor.getByLabel("Wisdom save proficient").check();
	await editor.getByRole("button", { name: "Save changes" }).click();
	await expect(editor).toBeHidden();

	await expectRoll(page, /Stealth, Dexterity, Expertise.*total \+7/);
	await expectRoll(page, /Perception, Wisdom, Proficient.*total \+4/);
	await expectRoll(page, /Wisdom save, Wisdom, Proficient.*total \+4/);
	await expectRoll(page, /Initiative, Dexterity, total \+3/);
	await expectRoll(page, /Passive Perception, Wisdom, Proficient.*total 14/);

	const stealthRoll = page.getByRole("button", {
		name: /Stealth, Dexterity, Expertise.*total \+7/,
	});
	await stealthRoll.click();
	const stealthItem = stealthRoll.locator("..");
	await expect(stealthItem.getByText("Source: Dexterity")).toBeVisible();
	await expect(stealthItem.getByText("Expertise", { exact: true })).toBeVisible();
	await expect(page.getByTestId("ability-row-dexterity")).toHaveAttribute(
		"data-source-highlight",
		"true",
	);
	await expect(page.getByTestId("ability-row-dexterity")).toContainText("+3");

	await page.reload();
	await expectRoll(page, /Stealth, Dexterity, Expertise.*total \+7/);
	await expect(page.getByTestId("ability-row-dexterity")).toContainText("16");
	await expect(page.getByTestId("ability-row-wisdom")).toContainText("14");

	await page.getByRole("button", { name: "Edit character" }).click();
	const characterEditor = page.getByRole("dialog", { name: "Edit character" });
	await characterEditor.getByLabel("Character level").fill("5");
	await characterEditor.getByRole("button", { name: "Save character" }).click();
	await expect(page.getByText("Level 5")).toBeVisible();
	await expect(page.getByText("Proficiency bonus").locator("..")).toContainText("+3");
	await expectRoll(page, /Stealth, Dexterity, Expertise.*total \+9/);
	await expectRoll(page, /Perception, Wisdom, Proficient.*total \+5/);
	await expectRoll(page, /Wisdom save, Wisdom, Proficient.*total \+5/);
	await expectRoll(page, /Passive Perception, Wisdom, Proficient.*total 15/);

	await page.goto(`${characterPath}/spells/`);
	await expect(page.getByRole("link", { name: "Spells & Abilities", exact: true })).toHaveAttribute(
		"aria-current",
		"page",
	);
	await expect(page.getByRole("heading", { name: "Spell slots" })).toBeVisible();
	await expect(page.getByRole("heading", { name: "Attributes & Rolls" })).toHaveCount(0);
	await expect(page.locator("#character-section-spells")).toHaveAttribute(
		"aria-labelledby",
		"character-section-spells-heading",
	);

	await page.getByRole("link", { name: "Inventory", exact: true }).click();
	await expect(page.locator("#character-section-inventory-heading")).toBeFocused();

	await expect(page.getByRole("link", { name: "Inventory", exact: true })).toHaveAttribute(
		"aria-current",
		"page",
	);
	await page.goBack();
	await expect(page).toHaveURL(/\/spells\/$/);
	await expect(page.getByRole("link", { name: "Spells & Abilities", exact: true })).toHaveAttribute(
		"aria-current",
		"page",
	);
	await page.goForward();
	await expect(page).toHaveURL(/\/inventory$/);

	await page.goto(`${characterPath}/inventory/`);
	await expect(page.getByRole("link", { name: "Inventory", exact: true })).toHaveAttribute(
		"aria-current",
		"page",
	);
	await expect(page.getByRole("heading", { name: "Personal inventory" })).toBeVisible();
	await expect(page.locator("#character-section-inventory")).toHaveAttribute(
		"aria-labelledby",
		"character-section-inventory-heading",
	);

	const otherContext = await browser.newContext();
	const otherPage = await otherContext.newPage();
	await otherPage.goto(`${new URL(page.url()).origin}${characterPath}/attributes`);
	await expect(otherPage.getByText("Character not found")).toBeVisible();
	const attributesResponse = await otherPage.request.get(`/api${characterPath}/attributes`);
	expect(attributesResponse.status()).toBe(404);
	await otherContext.close();
});

test("retains a failed attributes draft and resets the stale error on reopen", async ({ page }) => {
	let updateAttempts = 0;
	await page.route("**/api/characters/*/attributes", async (route) => {
		if (route.request().method() !== "PUT") return route.continue();
		updateAttempts += 1;
		if (updateAttempts === 1) {
			return route.fulfill({
				status: 503,
				contentType: "application/json",
				body: JSON.stringify({ error: "Attributes are temporarily unavailable." }),
			});
		}
		return route.continue();
	});

	await page.goto("/");
	await createCharacter(page, "Attributes Failure", "Fighter", 1);
	await page.getByRole("button", { name: "Edit attributes" }).click();
	let editor = page.getByRole("dialog", { name: "Edit attributes" });
	await editor.getByRole("textbox", { name: "Dexterity" }).fill("16");
	await editor.getByRole("button", { name: "Save changes" }).click();
	await expect(editor.getByText("Attributes could not be saved")).toBeVisible();
	await expect(editor.getByRole("textbox", { name: "Dexterity" })).toHaveValue("16");

	await editor.getByRole("button", { name: "Cancel" }).click();
	await page.getByRole("button", { name: "Edit attributes" }).click();
	editor = page.getByRole("dialog", { name: "Edit attributes" });
	await expect(editor.getByText("Attributes could not be saved")).toHaveCount(0);
	await expect(editor.getByRole("textbox", { name: "Dexterity" })).toHaveValue("10");
});

test("keeps section navigation safe at 320px with enlarged text", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 900 });
	await page.goto("/");
	await createCharacter(page, "Narrow Attributes", "Fighter", 1);
	await page.locator("html").evaluate((element) => {
		element.style.fontSize = "125%";
	});

	await expect(page.locator(".character-section-navigation-scroll")).toBeVisible();
	await expect(page.locator(".character-section-navigation-affordance")).toBeVisible();
	await expect
		.poll(async () =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
			),
		)
		.toBe(true);
	await expect(page.getByRole("link", { name: "Attributes & Rolls", exact: true })).toBeVisible();
	await expect(page.getByRole("link", { name: "Spells & Abilities", exact: true })).toBeVisible();
	await expect(page.getByRole("link", { name: "Inventory", exact: true })).toBeVisible();
});

async function createCharacter(page: Page, name: string, className: string, level: number) {
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill(name);
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: className }).click();
	await page.getByLabel("Level").fill(String(level));
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name })).toBeVisible();
}

async function expectRoll(page: Page, name: RegExp) {
	await expect(page.getByRole("button", { name })).toBeVisible();
}
