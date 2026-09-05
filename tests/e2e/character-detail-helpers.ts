import { expect, type Page } from "@playwright/test";

export async function openInventoryTab(page: Page) {
	const inventoryLink = page.getByRole("link", { name: "Inventory", exact: true });
	await expect(inventoryLink).toBeVisible();
	await inventoryLink.click();
	await expect(inventoryLink).toHaveAttribute("aria-current", "page");
}

export async function openSpellsAndAbilitiesTab(page: Page) {
	const spellsLink = page.getByRole("link", { name: "Spells & Abilities", exact: true });
	await expect(spellsLink).toBeVisible();
	await spellsLink.click();
	await expect(spellsLink).toHaveAttribute("aria-current", "page");
}
