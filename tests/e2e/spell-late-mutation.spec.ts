import { resolve } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import type { mountSpellPanel } from "../support/spell-panel-fixture.js";

declare global {
	interface Window {
		spellFixture: ReturnType<typeof mountSpellPanel>;
	}
}

test("late save updates its original character and cannot close a newer character dialog", async ({
	page,
}) => {
	const firstId = "00000000-0000-4000-8000-000000000011";
	const secondId = "00000000-0000-4000-8000-000000000012";
	const saved = {
		id: "00000000-0000-4000-8000-000000000031",
		slotLevel: 0,
		spellIndex: "light",
		name: "Light",
		level: 0,
		url: "/api/2014/spells/light",
		source: "spell",
	};
	let saving = false;
	let release = () => {};
	const held = new Promise<void>((done) => {
		release = done;
	});
	await page.route(`**/api/characters/${firstId}/spells/search`, (route) =>
		route.fulfill({
			json: {
				spells: [
					{
						index: "light",
						name: "Light",
						level: 0,
						url: "/api/2014/spells/light",
						source: "spell",
					},
				],
			},
		}),
	);
	await page.route(`**/api/characters/${firstId}/spells`, async (route) => {
		saving = true;
		await held;
		await route.fulfill({ json: { spells: [saved] } });
	});
	await mountFixture(page, firstId, secondId);
	try {
		await page.getByRole("button", { name: "Add cantrip or feature", exact: true }).click();
		await page.getByLabel("Search cantrips and features").fill("light");
		await expect(page.getByRole("dialog").getByRole("button", { name: /Light/ })).toBeVisible();
		await page.getByRole("dialog").getByRole("button", { name: /Light/ }).click();
		await expect.poll(() => saving).toBe(true);
		await page.evaluate((id) => window.spellFixture.render(id), secondId);
		await expect(page.getByRole("dialog")).toBeHidden();
		await page.getByRole("button", { name: "Add cantrip or feature", exact: true }).click();
		const newDialog = page.getByRole("dialog", { name: "Add cantrip or feature", exact: true });
		await expect(newDialog).toBeVisible();
		release();
		await expect
			.poll(() => page.evaluate((id) => window.spellFixture.readSpells(id), firstId))
			.toEqual({ spells: [saved] });
		expect(await page.evaluate((id) => window.spellFixture.readSpells(id), secondId)).toEqual({
			spells: [],
		});
		await expect(newDialog).toBeVisible();
		await expect(newDialog.getByLabel("Search cantrips and features")).toHaveValue("");
	} finally {
		release();
		if (!page.isClosed()) await page.evaluate(() => window.spellFixture.dispose());
	}
});

for (const operation of ["configuration", "defaults", "use", "restore"] as const) {
	test(`late ${operation} completion preserves a newer character configuration and cache`, async ({
		page,
	}) => {
		const firstId = "00000000-0000-4000-8000-000000000011";
		const secondId = "00000000-0000-4000-8000-000000000012";
		const response = {
			spellSlots: Array.from({ length: 9 }, (_, index) => ({
				level: index + 1,
				total: 4,
				used: 1,
				remaining: 3,
			})),
			recentSpellSlotChanges: [],
		};
		let requests = 0;
		let release = () => {};
		const held = new Promise<void>((done) => {
			release = done;
		});
		await page.route(
			`**/api/characters/${firstId}/spell-slots${operation === "configuration" ? "" : operation === "defaults" ? "/apply-defaults" : `/${operation}`}`,
			async (route) => {
				requests++;
				await held;
				await route.fulfill({ json: response });
			},
		);
		await mountFixture(page, firstId, secondId);
		try {
			await page.getByRole("button", { name: "Edit spells", exact: true }).click();
			if (operation === "configuration" || operation === "defaults") {
				await page.getByRole("button", { name: "Configure slots", exact: true }).click();
				await page
					.getByRole("dialog")
					.getByRole("button", {
						name: operation === "defaults" ? "Apply class defaults" : "Save changes",
						exact: true,
					})
					.click();
				await expect.poll(() => requests).toBe(1);
				await expect(
					page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }),
				).toBeDisabled();
			} else {
				await page
					.getByRole("button", {
						name: operation === "use" ? "Use 1st-level" : "Restore 1st-level",
						exact: true,
					})
					.click();
				await expect.poll(() => requests).toBe(1);
				await expect(
					page.getByRole("button", { name: "Use 1st-level", exact: true }),
				).toBeDisabled();
				await expect(
					page.getByRole("button", { name: "Restore 1st-level", exact: true }),
				).toBeDisabled();
			}
			await page.evaluate((id) => window.spellFixture.render(id), secondId);
			await expect(page.getByRole("dialog")).toBeHidden();
			await page.getByRole("button", { name: "Configure slots", exact: true }).click();
			const current = page.getByRole("dialog", { name: "Configure spell slots", exact: true });
			await current.getByLabel("1st-level slot total", { exact: true }).fill("7");
			release();
			await expect
				.poll(() => page.evaluate((id) => window.spellFixture.readSlots(id), firstId))
				.toEqual(response);
			const secondSlots = await page.evaluate((id) => window.spellFixture.readSlots(id), secondId);
			expect(secondSlots).toEqual({
				spellSlots: response.spellSlots.map((slot) => ({ ...slot, total: 2, remaining: 1 })),
				recentSpellSlotChanges: [],
			});
			await expect(current).toBeVisible();
			await expect(current.getByLabel("1st-level slot total", { exact: true })).toHaveValue("7");
			await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
			expect(requests).toBe(1);
		} finally {
			release();
			if (!page.isClosed()) await page.evaluate(() => window.spellFixture.dispose());
		}
	});
}

async function mountFixture(page: Page, firstId: string, secondId: string) {
	await page.goto("/");
	await page.evaluate(
		async ({ modulePath, firstId, secondId }) => {
			const { mountSpellPanel } = await import(modulePath);
			const app = document.getElementById("root");
			if (app) app.hidden = true;
			const container = document.createElement("section");
			document.body.append(container);
			window.spellFixture = mountSpellPanel(container, firstId, secondId);
		},
		{ modulePath: `/@fs/${resolve("tests/support/spell-panel-fixture.tsx")}`, firstId, secondId },
	);
}
