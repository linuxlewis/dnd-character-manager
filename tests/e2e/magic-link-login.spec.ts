import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("signs in with a magic link and keeps anonymous characters", async ({ page }) => {
	const email = `player-${Date.now()}@example.test`;

	await page.goto("/");
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Linkward Bard");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Bard" }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Linkward Bard" })).toBeVisible();

	await page.getByText("Back to characters").click();
	await page.getByLabel("Email").fill(email);
	await page.getByRole("button", { name: "Email sign-in link" }).click();
	await expect(page.getByText("Sign-in link sent")).toBeVisible();

	const token = await readMagicLinkToken(email);
	await page.goto(`/api/auth/magic-link/verify?token=${token}&callbackURL=/`);

	await expect(page).toHaveURL(/\/$/);
	await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
	await expect(page.getByRole("link", { name: "Linkward Bard" })).toBeVisible();

	await page.getByRole("link", { name: "Linkward Bard" }).click();
	await expect(page.getByRole("heading", { name: "Linkward Bard" })).toBeVisible();

	await page.getByRole("button", { name: "Sign out" }).click();

	await expect(page.getByText("Anonymous session")).toBeVisible();
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByText("Character not found")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Linkward Bard" })).not.toBeVisible();
});

async function readMagicLinkToken(email: string) {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error("DATABASE_URL is required for magic-link e2e tests.");

	const sql = postgres(databaseUrl, { max: 1 });
	try {
		const rows = await sql<{ identifier: string; value: string }[]>`
			SELECT identifier, value
			FROM verification
			ORDER BY created_at DESC
		`;
		const row = rows.find((candidate) => JSON.parse(candidate.value).email === email);
		if (!row) throw new Error(`Magic link token not found for ${email}.`);
		return row.identifier;
	} finally {
		await sql.end();
	}
}
