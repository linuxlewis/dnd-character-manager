import { expect, test } from "@playwright/test";
import postgres from "postgres";

test("signs in with a magic link and keeps anonymous characters", async ({ page }) => {
	const email = `player-${Date.now()}@example.test`;

	await page.goto("/characters");
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Linkward Bard");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Bard" }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Linkward Bard" })).toBeVisible();

	await page.getByRole("link", { name: "Back to characters", exact: true }).click();
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.getByLabel("Email").fill(email);
	await page.getByRole("button", { name: "Email sign-in link" }).click();
	await expect(page.getByText("Sign-in link sent")).toBeVisible();

	const token = await readMagicLinkToken(email);
	await page.goto(`/api/auth/magic-link/verify?token=${token}&callbackURL=/characters`);

	await expect(page).toHaveURL(/\/characters$/);
	await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Linkward Bard" })).toBeVisible();

	await page.getByRole("link", { name: "Linkward Bard" }).click();
	await expect(page.getByRole("heading", { name: "Linkward Bard" })).toBeVisible();

	await page.getByRole("button", { name: "Open account menu" }).click();
	await page.getByRole("menuitem", { name: "Sign out" }).click();

	await expect(page.getByText("Character not found")).toBeVisible();
	await page.getByRole("button", { name: "Open account menu" }).click();
	await page.getByRole("menuitem", { name: "Sign in" }).click();
	await expect(page.getByLabel("Email")).toBeVisible();
	await expect(page.getByText("Character not found")).toBeVisible();
	await expect(page.getByRole("heading", { name: "Linkward Bard" })).not.toBeVisible();
});

test("signs in with the emailed code and keeps anonymous characters", async ({ page }) => {
	const email = `coder-${Date.now()}@example.test`;

	await page.goto("/characters");
	await page.getByText("Create character").first().click();
	await page.getByLabel("Name").fill("Codebound Cleric");
	await page.getByRole("combobox", { name: "Class" }).click();
	await page.getByRole("option", { name: "Cleric" }).click();
	await page.getByRole("button", { name: "Create character" }).click();
	await expect(page.getByRole("heading", { name: "Codebound Cleric" })).toBeVisible();

	await page.getByRole("link", { name: "Back to characters", exact: true }).click();
	await page.getByRole("button", { name: "Sign in" }).click();
	await page.getByLabel("Email").fill(email);
	await page.getByRole("button", { name: "Email sign-in link" }).click();
	await expect(page.getByText("Sign-in link sent")).toBeVisible();
	await expect(page.getByText(`We emailed ${email}`)).toBeVisible();

	const code = await readSignInCode(email);
	const wrongCode = code === "000000" ? "111111" : "000000";
	await page.getByLabel("Sign-in code").fill(wrongCode);
	await page.getByRole("button", { name: "Sign in with code" }).click();
	await expect(page.getByText("Code not accepted")).toBeVisible();

	await page.getByLabel("Sign-in code").fill(`${code.slice(0, 3)} ${code.slice(3)}`);
	await page.getByRole("button", { name: "Sign in with code" }).click();

	await expect(page.getByRole("dialog", { name: "Sign in" })).not.toBeVisible();
	await expect(page).toHaveURL(/\/characters$/);
	await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Codebound Cleric" })).toBeVisible();

	await page.reload();
	await expect(page.getByRole("button", { name: "Open account menu" })).toBeVisible();
	await expect(page.getByRole("link", { name: "Codebound Cleric" })).toBeVisible();
});

async function readMagicLinkToken(email: string) {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error("DATABASE_URL is required for magic-link e2e tests.");

	const sql = postgres(databaseUrl, { max: 1 });
	try {
		const rows = await sql<{ identifier: string; value: string }[]>`
			SELECT identifier, value
			FROM verification
			WHERE identifier NOT LIKE 'sign-in-otp-%'
			ORDER BY created_at DESC
		`;
		const row = rows.find((candidate) => JSON.parse(candidate.value).email === email);
		if (!row) throw new Error(`Magic link token not found for ${email}.`);
		return row.identifier;
	} finally {
		await sql.end();
	}
}

async function readSignInCode(email: string) {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error("DATABASE_URL is required for sign-in code e2e tests.");

	const sql = postgres(databaseUrl, { max: 1 });
	try {
		const rows = await sql<{ value: string }[]>`
			SELECT value
			FROM verification
			WHERE identifier = ${`sign-in-otp-${email}`}
			ORDER BY created_at DESC
			LIMIT 1
		`;
		const row = rows[0];
		if (!row) throw new Error(`Sign-in code not found for ${email}.`);
		return row.value.split(":")[0] ?? "";
	} finally {
		await sql.end();
	}
}
