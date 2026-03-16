import { expect, test } from "./fixtures.ts";

test.describe("Character sheet view", () => {
	test("displays all character sections", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		await expect(page.getByRole("heading", { name: "Thorin Ironforge" })).toBeVisible();
		await expect(page.getByText("Dwarf Fighter · Level 5")).toBeVisible();

		await expect(page.getByText("Ability Scores")).toBeVisible();
		for (const stat of ["STR", "DEX", "CON", "INT", "WIS", "CHA"]) {
			await expect(page.getByLabel(`${stat} ability score`)).toContainText(stat);
		}

		await expect(page.getByRole("heading", { name: "Hit Points" })).toBeVisible();
		await expect(page.getByText("10 / 10")).toBeVisible();
		await expect(page.getByRole("heading", { name: "Conditions" })).toBeVisible();

		await expect(page.getByText("Skills")).toBeVisible();
		await expect(page.getByText("Athletics")).toBeVisible();
		await expect(page.getByText("Perception")).toBeVisible();

		await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();

		await expect(page.getByRole("button", { name: "Damage" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Heal" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Delete Character" })).toBeVisible();
	});

	test("navigating from list to sheet and back", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto("/");

		await page.getByText("Thorin Ironforge").click();
		await expect(page.getByRole("heading", { name: "Thorin Ironforge" })).toBeVisible();

		await page.getByRole("button", { name: "Back" }).click();
		await expect(page.getByRole("heading", { name: "Characters" })).toBeVisible();
	});

	test("displays ability score modifiers correctly", async ({ page, createCharacter }) => {
		await createCharacter();
		await page.goto("/");
		await page.getByText("Thorin Ironforge").click();

		await expect(page.getByLabel("STR ability score")).toContainText("+3");
		await expect(page.getByLabel("CHA ability score")).toContainText("-1");
	});

	test("tracks temp HP, concentration, and active conditions", async ({ page, createCharacter }) => {
		const character = await createCharacter({
			hp: { current: 18, max: 24, temp: 7 },
			concentration: true,
			conditions: [{ name: "Poisoned", durationRounds: 4 }],
		});
		await page.goto(`/character/${character.id}`);

		await expect(page.getByText("18 / 24")).toBeVisible();
		await expect(page.getByText("+7 temp", { exact: true })).toBeVisible();
		await expect(page.getByText("Concentration").first()).toBeVisible();
		await expect(page.getByLabel("Active conditions indicator")).toContainText("1 active");
		await expect(page.getByLabel("Active conditions list")).toContainText("Poisoned (4r)");
	});

	test("shows condition descriptions on hover", async ({ page, createCharacter }) => {
		const character = await createCharacter();
		await page.goto(`/character/${character.id}`);

		const blindedRow = page.locator("div").filter({ hasText: /^BlindedInfo$/ }).first();
		await blindedRow.getByText("Info").hover();
		await expect(page.getByText("A blinded creature can't see").first()).toBeVisible();
	});
});
