import { expect, test } from "@playwright/test";

test("mobile spells keep play actions visible and configuration recoverable", async ({
	page,
}, testInfo) => {
	test.setTimeout(90_000);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto("/");
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Mira Thorn");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Wizard" }).click();
	await page.getByLabel("Level").fill("3");
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Mira Thorn" })).toBeVisible();
	const characterId = new URL(page.url()).pathname.split("/")[2];
	expect(
		(
			await page.request.put(`/api/characters/${characterId}/experience`, {
				data: { experiencePoints: 2196 },
			})
		).ok(),
	).toBeTruthy();
	expect(
		(
			await page.request.put(`/api/characters/${characterId}/health`, {
				data: { currentHp: 18, maxHp: 24, temporaryHp: 3 },
			})
		).ok(),
	).toBeTruthy();
	const healthWrite = await page.request.put(`/api/characters/${characterId}/health`, {
		data: { currentHp: 18, maxHp: 24, temporaryHp: 3 },
	});
	expect(healthWrite.ok()).toBeTruthy();
	expect((await healthWrite.json()).health.currentHp).toBe(18);
	await page.reload();
	await page.getByRole("button", { name: "Edit spells", exact: true }).click();
	await page.getByRole("button", { name: "Configure slots", exact: true }).click();
	await page.getByLabel("1st-level slot total").fill("4");
	await page.getByLabel("2nd-level slot total").fill("2");
	await page.getByRole("button", { name: "Save changes", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Configure spell slots" })).toBeHidden();
	await page.getByRole("button", { name: "Add cantrip or feature" }).click();
	await page.getByLabel("Search cantrips and features").fill("light");
	await page.getByRole("button", { name: /^Light\b/ }).click();
	await expect(page.getByRole("dialog", { name: "Add cantrip or feature" })).toBeHidden();
	await page.getByRole("button", { name: "Add spell to 1st-level", exact: true }).click();
	await page.getByLabel("Search spells").fill("divine smite");
	await page.getByRole("button", { name: /^Divine Smite\b/ }).click();
	await expect(page.getByRole("dialog", { name: "Add spell to 1st-level" })).toBeHidden();
	await page.getByRole("button", { name: "Use 1st-level", exact: true }).click();
	await expect(page.getByText("3 / 4 remaining")).toBeVisible();
	const nav = page.getByRole("navigation", { name: "Character sections" });
	for (const viewport of [
		{ width: 320, height: 740 },
		{ width: 390, height: 844 },
		{ width: 1280, height: 900 },
	]) {
		await page.setViewportSize(viewport);
		await page.evaluate(() => window.scrollTo(0, 0));
		const entry = page.getByRole("button", { name: "View Light details" });
		await expect(entry).toBeInViewport();
		if (viewport.width < 768) {
			const entryBox = await entry.boundingBox();
			const navBox = await nav.boundingBox();
			expect(entryBox && navBox && entryBox.y + entryBox.height <= navBox.y).toBeTruthy();
		}
		if (viewport.width === 390)
			await expect(
				page.getByRole("button", { name: "Use 1st-level", exact: true }),
			).toBeInViewport();
		await page.screenshot({ path: testInfo.outputPath(`spells-${viewport.width}-populated.png`) });
		await page.getByRole("button", { name: "Edit spells", exact: true }).click();
		await page.getByRole("button", { name: "Configure slots", exact: true }).click();
		const dialog = page.getByRole("dialog", { name: "Configure spell slots" });
		await expect(dialog.getByRole("button", { name: "Save changes" })).toBeInViewport();
		await page.screenshot({
			path: testInfo.outputPath(`spells-${viewport.width}-configuration-top.png`),
		});
		await dialog.getByLabel("9th-level slot total").scrollIntoViewIfNeeded();
		await expect(dialog.getByRole("button", { name: "Save changes" })).toBeInViewport();
		await page.screenshot({
			path: testInfo.outputPath(`spells-${viewport.width}-configuration-bottom.png`),
		});
		await dialog.getByRole("button", { name: "Cancel" }).click();
		await page.getByRole("button", { name: "Done", exact: true }).click();
	}
	await page.setViewportSize({ width: 390, height: 844 });
	await page.getByRole("button", { name: "Edit spells", exact: true }).click();
	await page.getByRole("button", { name: "Configure slots", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Configure spell slots" });
	await dialog.getByLabel("1st-level slot total").fill("");
	await dialog.getByRole("button", { name: "Save changes" }).click();
	await expect(dialog.getByText("Enter a whole number from 0 to 99.")).toBeVisible();
	await expect(dialog.getByLabel("1st-level slot total")).toBeFocused();
	await dialog.getByLabel("1st-level slot total").fill("5");
	await page.route("**/api/characters/*/spell-slots", (route) =>
		route.request().method() === "PUT" ? route.abort() : route.continue(),
	);
	await dialog.getByRole("button", { name: "Save changes" }).click();
	await expect(dialog.getByText("Spell configuration not saved")).toBeVisible();
	await expect(dialog.getByLabel("1st-level slot total")).toHaveValue("5");
	await page.screenshot({ path: testInfo.outputPath("spells-390-configuration-error.png") });
	await page.unroute("**/api/characters/*/spell-slots");
	await dialog.getByRole("button", { name: "Save changes" }).click();
	await expect(dialog).toBeHidden();
	await expect(page.getByText("4 / 5 remaining")).toBeVisible();
});
