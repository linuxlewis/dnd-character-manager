import { expect, type Page } from "@playwright/test";

export async function openInventoryTab(page: Page) {
	const inventoryTab = page.getByRole("tab", { name: "Inventory", exact: true });
	await expect(inventoryTab).toBeVisible();
	await inventoryTab.click();
	await expect(inventoryTab).toHaveAttribute("aria-selected", "true");
}

export async function openSpellsAndAbilitiesTab(page: Page) {
	const spellsTab = page.getByRole("tab", { name: "Spells & Abilities", exact: true });
	await expect(spellsTab).toBeVisible();
	await spellsTab.click();
	await expect(spellsTab).toHaveAttribute("aria-selected", "true");
}
