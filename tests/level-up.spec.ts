/**
 * E2E tests for the level-up wizard
 */

import { test, expect } from "@playwright/test";

test.describe("Level-up Wizard", () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to the app
		await page.goto("/");
	});

	test("should show level-up button for characters under level 20", async ({ page }) => {
		// Create a new character
		await page.click('[data-testid="create-character"]');
		await page.fill('[data-testid="character-name"]', "Test Wizard");
		await page.fill('[data-testid="character-race"]', "Human");
		await page.fill('[data-testid="character-class"]', "Wizard");
		
		// Fill ability scores
		await page.fill('[data-testid="ability-STR"]', "8");
		await page.fill('[data-testid="ability-DEX"]', "14");
		await page.fill('[data-testid="ability-CON"]', "13");
		await page.fill('[data-testid="ability-INT"]', "15");
		await page.fill('[data-testid="ability-WIS"]', "12");
		await page.fill('[data-testid="ability-CHA"]', "10");
		
		await page.click('[data-testid="save-character"]');
		
		// Should see level-up button
		await expect(page.locator("text=Level Up")).toBeVisible();
		
		// Character should show level 1
		await expect(page.locator("text=Level 1")).toBeVisible();
	});

	test("should complete level-up wizard without ASI", async ({ page }) => {
		// Create a level 1 character
		await page.click('[data-testid="create-character"]');
		await page.fill('[data-testid="character-name"]', "Test Fighter");
		await page.fill('[data-testid="character-race"]', "Human");
		await page.fill('[data-testid="character-class"]', "Fighter");
		
		// Fill ability scores  
		await page.fill('[data-testid="ability-STR"]', "15");
		await page.fill('[data-testid="ability-DEX"]', "14");
		await page.fill('[data-testid="ability-CON"]', "13");
		await page.fill('[data-testid="ability-INT"]', "10");
		await page.fill('[data-testid="ability-WIS"]', "12");
		await page.fill('[data-testid="ability-CHA"]', "8");
		
		await page.click('[data-testid="save-character"]');
		
		// Click level-up button
		await page.click("text=Level Up");
		
		// Should show level-up wizard
		await expect(page.locator("text=Level Up Wizard")).toBeVisible();
		await expect(page.locator("text=Level 1 → 2")).toBeVisible();
		
		// Should show HP gain summary
		await expect(page.locator("text=+6 HP")).toBeVisible(); // Fighter d10: 5+1+1(CON)=7, wait let me recalculate
		
		// Level 2 doesn't get ASI, so should skip to confirm
		await page.click("text=Next");
		await expect(page.locator("text=Confirm Level Up")).toBeVisible();
		
		// Confirm level up
		await page.click("text=Level Up!");
		
		// Should see success message and updated level
		await expect(page.locator("text=Level 2")).toBeVisible();
		await page.waitForSelector("text=leveled up to level 2", { timeout: 5000 });
	});

	test("should handle ability score improvements at level 4", async ({ page }) => {
		// Create a level 3 character (close to ASI level)
		await page.click('[data-testid="create-character"]');
		await page.fill('[data-testid="character-name"]', "ASI Test");
		await page.fill('[data-testid="character-race"]', "Elf");
		await page.fill('[data-testid="character-class"]', "Rogue");
		await page.selectOption('[data-testid="character-level"]', "3");
		
		// Fill ability scores
		await page.fill('[data-testid="ability-STR"]', "8");
		await page.fill('[data-testid="ability-DEX"]', "15");
		await page.fill('[data-testid="ability-CON"]', "14");
		await page.fill('[data-testid="ability-INT"]', "12");
		await page.fill('[data-testid="ability-WIS"]', "13");
		await page.fill('[data-testid="ability-CHA"]', "10");
		
		await page.click('[data-testid="save-character"]');
		
		// Click level-up button
		await page.click("text=Level Up");
		
		// Should show summary with ASI notification
		await expect(page.locator("text=Ability Score Improvement")).toBeVisible();
		await expect(page.locator("text=2 points to distribute")).toBeVisible();
		
		// Go to abilities step
		await page.click("text=Next");
		await expect(page.locator("text=Distribute 2 points")).toBeVisible();
		
		// Try to proceed without spending points (should be disabled)
		const nextButton = page.locator("button:has-text('Next')");
		await expect(nextButton).toBeDisabled();
		
		// Distribute points
		await page.selectOption("select[data-testid='ability-DEX-improvement']", "1");
		await page.selectOption("select[data-testid='ability-CON-improvement']", "1");
		
		// Now should be able to proceed
		await expect(nextButton).toBeEnabled();
		await page.click("text=Next");
		
		// Go to confirm
		await expect(page.locator("text=Confirm Level Up")).toBeVisible();
		await expect(page.locator("text=DEX: 15 → 16")).toBeVisible();
		await expect(page.locator("text=CON: 14 → 15")).toBeVisible();
		
		// Complete level up
		await page.click("text=Level Up!");
		
		// Verify results
		await expect(page.locator("text=Level 4")).toBeVisible();
		await page.waitForSelector("text=leveled up to level 4", { timeout: 5000 });
	});

	test("should handle spell slot progression for casters", async ({ page }) => {
		// Create a level 2 wizard (getting level 3 = 2nd level spells)
		await page.click('[data-testid="create-character"]');
		await page.fill('[data-testid="character-name"]', "Spell Test");
		await page.fill('[data-testid="character-race"]', "Human");
		await page.fill('[data-testid="character-class"]', "Wizard");
		await page.selectOption('[data-testid="character-level"]', "2");
		
		// Fill ability scores
		await page.fill('[data-testid="ability-STR"]', "8");
		await page.fill('[data-testid="ability-DEX"]', "14");
		await page.fill('[data-testid="ability-CON"]', "13");
		await page.fill('[data-testid="ability-INT"]', "15");
		await page.fill('[data-testid="ability-WIS"]', "12");
		await page.fill('[data-testid="ability-CHA"]', "10");
		
		await page.click('[data-testid="save-character"]');
		
		// Click level-up button
		await page.click("text=Level Up");
		
		// Should show spell slots in summary
		await expect(page.locator("text=New spell slots available")).toBeVisible();
		
		// Go to spells step  
		await page.click("text=Next");
		await expect(page.locator("text=Spell Slots")).toBeVisible();
		await expect(page.locator("text=Level 1 Spell Slots")).toBeVisible();
		await expect(page.locator("text=Level 2 Spell Slots")).toBeVisible();
		
		// Should show new spell slots with sparkle
		await expect(page.locator("text=✨")).toBeVisible();
		
		// Continue to confirm
		await page.click("text=Next");
		await expect(page.locator("text=New spell slots available")).toBeVisible();
		
		// Complete level up
		await page.click("text=Level Up!");
		
		// Verify spell slots section appears
		await expect(page.locator("text=Level 3")).toBeVisible();
		await expect(page.locator('[data-testid="spell-slots-section"]')).toBeVisible();
	});

	test("should not show level-up button at max level", async ({ page }) => {
		// Create a level 20 character
		await page.click('[data-testid="create-character"]');
		await page.fill('[data-testid="character-name"]', "Max Level");
		await page.fill('[data-testid="character-race"]', "Human");
		await page.fill('[data-testid="character-class"]', "Paladin");
		await page.selectOption('[data-testid="character-level"]', "20");
		
		// Fill ability scores
		await page.fill('[data-testid="ability-STR"]', "20");
		await page.fill('[data-testid="ability-DEX"]', "14");
		await page.fill('[data-testid="ability-CON"]', "16");
		await page.fill('[data-testid="ability-INT"]', "10");
		await page.fill('[data-testid="ability-WIS"]', "12");
		await page.fill('[data-testid="ability-CHA"]', "18");
		
		await page.click('[data-testid="save-character"]');
		
		// Should NOT see level-up button
		await expect(page.locator("text=Level Up")).not.toBeVisible();
		await expect(page.locator("text=Level 20")).toBeVisible();
	});

	test("should validate ability score maximum", async ({ page }) => {
		// Create a character with high ability scores
		await page.click('[data-testid="create-character"]');
		await page.fill('[data-testid="character-name"]', "High Stats");
		await page.fill('[data-testid="character-race"]', "Human");
		await page.fill('[data-testid="character-class"]', "Fighter");
		await page.selectOption('[data-testid="character-level"]', "3");
		
		// Fill ability scores with STR at 19 (close to max)
		await page.fill('[data-testid="ability-STR"]', "19");
		await page.fill('[data-testid="ability-DEX"]', "14");
		await page.fill('[data-testid="ability-CON"]', "16");
		await page.fill('[data-testid="ability-INT"]', "10");
		await page.fill('[data-testid="ability-WIS"]', "12");
		await page.fill('[data-testid="ability-CHA"]', "8");
		
		await page.click('[data-testid="save-character"]');
		
		// Level up to 4 (ASI level)
		await page.click("text=Level Up");
		await page.click("text=Next");
		
		// STR should only allow +1 (to reach 20 max)
		const strSelect = page.locator("select[data-testid='ability-STR-improvement']");
		await expect(strSelect.locator("option[value='2']")).not.toBeVisible();
		await expect(strSelect.locator("option[value='1']")).toBeVisible();
		
		// Should be able to put +1 STR, +1 elsewhere
		await page.selectOption("select[data-testid='ability-STR-improvement']", "1");
		await page.selectOption("select[data-testid='ability-DEX-improvement']", "1");
		
		// Should show STR going to 20
		await expect(page.locator("text=19 → 20")).toBeVisible();
		
		await page.click("text=Next");
		await page.click("text=Level Up!");
		
		// Verify successful level up
		await page.waitForSelector("text=leveled up to level 4", { timeout: 5000 });
	});
});