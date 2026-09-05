import { expect, type Page, test } from "@playwright/test";

test("searches and filters every attributes roll group, including the empty state", async ({
	page,
}) => {
	await page.goto("/");
	await createCharacter(page, "Attributes Filters", "Fighter", 5);

	const search = page.getByRole("textbox", { name: "Search rolls" });
	await search.fill("stealth");
	await expect(page.getByRole("button", { name: /Stealth, Dexterity/ })).toBeVisible();
	await expect(page.getByRole("button", { name: /Athletics, Strength/ })).toHaveCount(0);

	await search.fill("no such roll");
	await expect(page.getByText("No rolls match this search.")).toBeVisible();

	await search.fill("");
	await expect(search).toHaveValue("");
	await page.getByRole("button", { name: "All", exact: true }).click();
	await expect(page.getByText("No rolls match this search.")).toHaveCount(0);
	const rolls = page.locator(".attributes-ledger-rolls");
	await expect(rolls.getByRole("button", { name: /Athletics, Strength/ })).toBeVisible();
	await expect(groupHeading(rolls, "Ability checks")).toBeVisible();
	await expect(groupHeading(rolls, "Skills")).toBeVisible();
	await expect(groupHeading(rolls, "Saving throws")).toBeVisible();
	await expect(groupHeading(rolls, "Passive values")).toBeVisible();

	await page.getByRole("button", { name: "Checks & skills", exact: true }).click();
	await expect(groupHeading(rolls, "Ability checks")).toBeVisible();
	await expect(groupHeading(rolls, "Skills")).toBeVisible();
	await expect(groupHeading(rolls, "Saving throws")).toHaveCount(0);
	await expect(groupHeading(rolls, "Passive values")).toHaveCount(0);

	await page.getByRole("button", { name: "Saving throws", exact: true }).click();
	await expect(groupHeading(rolls, "Saving throws")).toBeVisible();
	await expect(groupHeading(rolls, "Ability checks")).toHaveCount(0);
	await expect(groupHeading(rolls, "Skills")).toHaveCount(0);

	await page.getByRole("button", { name: "Other", exact: true }).click();
	await expect(groupHeading(rolls, "Initiative")).toBeVisible();
	await expect(groupHeading(rolls, "Passive values")).toBeVisible();
	await expect(groupHeading(rolls, "Ability checks")).toHaveCount(0);
	await expect(groupHeading(rolls, "Saving throws")).toHaveCount(0);

	await page.getByRole("button", { name: "All", exact: true }).click();
	await expect(groupHeading(rolls, "Ability checks")).toBeVisible();
	await expect(groupHeading(rolls, "Saving throws")).toBeVisible();
});

test("keeps the Ribbon-and-Ledger shell safe at md, 320px, and enlarged text", async ({ page }) => {
	await page.setViewportSize({ width: 1024, height: 900 });
	await page.goto("/");
	await createCharacter(page, "Attributes Geometry", "Fighter", 5);

	const desktopLedgerColumns = await page
		.locator(".attributes-ledger")
		.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
	expect(desktopLedgerColumns.split(" ")).toHaveLength(2);

	await page.setViewportSize({ width: 320, height: 900 });
	await expect(page.locator(".attributes-ledger")).toBeVisible();
	const narrowLedgerColumns = await page
		.locator(".attributes-ledger")
		.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
	expect(narrowLedgerColumns.split(" ")).toHaveLength(1);
	const narrowScoreColumns = await page
		.locator(".ability-score-list")
		.evaluate((element) => getComputedStyle(element).gridTemplateColumns);
	expect(narrowScoreColumns.split(" ")).toHaveLength(2);
	await expect(page.locator(".character-section-navigation-affordance")).toBeHidden();
	await expectNoPageOverflow(page);

	const navMetrics = await page
		.locator(".character-section-navigation-scroll")
		.evaluate((element) => ({
			clientWidth: element.clientWidth,
			scrollWidth: element.scrollWidth,
		}));
	expect(navMetrics.scrollWidth).toBe(navMetrics.clientWidth);

	const links = page.locator(".character-section-link");
	await expect(links).toHaveCount(3);
	await expect(links.nth(0)).toBeVisible();
	await expect(links.nth(1)).toBeVisible();
	await expect(links.nth(2)).toBeVisible();
	await expect(links.nth(0)).toHaveCSS("color", "rgb(251, 113, 133)");
	await expect(links.nth(1)).toHaveCSS("color", "rgb(184, 184, 184)");

	await links.nth(0).focus();
	await page.keyboard.press("Tab");
	await expect(links.nth(1)).toBeFocused();
	await expect(links.nth(1)).toHaveCSS("outline-style", "solid");

	await page.locator("html").evaluate((element) => {
		element.style.fontSize = "125%";
	});
	await expectNoPageOverflow(page);
	const enlargedOverflow = await page
		.locator(".character-section-navigation-scroll")
		.evaluate((element) => ({
			clientWidth: element.clientWidth,
			scrollWidth: element.scrollWidth,
		}));
	if (enlargedOverflow.scrollWidth > enlargedOverflow.clientWidth) {
		await expect(page.locator(".character-section-navigation-affordance")).toBeVisible();
		await page.locator(".character-section-navigation-scroll").evaluate((element) => {
			element.scrollLeft = element.scrollWidth;
			element.dispatchEvent(new Event("scroll"));
		});
		await expect(page.locator(".character-section-navigation-affordance")).toBeHidden();
	} else {
		await expect(page.locator(".character-section-navigation-affordance")).toBeHidden();
	}

	const contrast = await page
		.locator(".attributes-metadata")
		.first()
		.evaluate((element) => {
			const foreground = getComputedStyle(element).color;
			const surface = getComputedStyle(
				element.closest(".mantine-Paper-root") ?? document.body,
			).backgroundColor;
			const parseRgb = (value: string) =>
				value
					.match(/\d+(?:\.\d+)?/g)
					?.map(Number)
					.slice(0, 3) ?? [];
			const luminance = (value: string) =>
				parseRgb(value).reduce((sum, channel, index) => {
					const normalized = channel / 255;
					const linear =
						normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
					return sum + linear * [0.2126, 0.7152, 0.0722][index];
				}, 0);
			const foregroundLuminance = luminance(foreground);
			const surfaceLuminance = luminance(surface);
			return {
				foreground,
				surface,
				ratio:
					(Math.max(foregroundLuminance, surfaceLuminance) + 0.05) /
					(Math.min(foregroundLuminance, surfaceLuminance) + 0.05),
			};
		});
	expect(contrast.ratio).toBeGreaterThanOrEqual(4.5);
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

function groupHeading(rolls: ReturnType<Page["locator"]>, name: string) {
	return rolls.locator("p.attributes-metadata").filter({ hasText: new RegExp(`^${name}$`) });
}

async function expectNoPageOverflow(page: Page) {
	await expect
		.poll(() =>
			page.evaluate(
				() => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
			),
		)
		.toBe(true);
}
