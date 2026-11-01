import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable, verificationTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { eq, inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../../app-server.js";

const createdUserIds: string[] = [];

afterEach(async () => {
	resetAuthForTest();
	await getDb().delete(verificationTable);
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
	await closeDb();
});

describe("auth routes", () => {
	it("creates a magic link verification request for a normalized email", async () => {
		const app = await buildServer();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/magic-link-requests",
				payload: { email: " Player@Example.COM " },
			});

			expect(response.statusCode).toBe(202);
			expect(response.json()).toEqual({ status: "sent" });

			const rows = await getDb()
				.select({
					identifier: verificationTable.identifier,
					value: verificationTable.value,
				})
				.from(verificationTable);
			const emailValues = rows
				.filter((row) => !row.identifier.startsWith("sign-in-otp-"))
				.map((row) => JSON.parse(row.value).email);

			expect(emailValues).toContain("player@example.com");
		} finally {
			await app.close();
		}
	});

	it("rejects invalid magic link request bodies", async () => {
		const app = await buildServer();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/magic-link-requests",
				payload: { email: "not-an-email" },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toEqual({ error: "Invalid request body." });
		} finally {
			await app.close();
		}
	});

	it("creates a sign-in code alongside the magic link for the same email", async () => {
		const app = await buildServer();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/magic-link-requests",
				payload: { email: "Coder@Example.COM" },
			});
			expect(response.statusCode).toBe(202);

			expect(await readSignInCode("coder@example.com")).toMatch(/^\d{6}$/);
		} finally {
			await app.close();
		}
	});

	it("signs in with the emailed code and keeps the anonymous session's characters", async () => {
		const app = await buildServer();
		try {
			const anonymous = await app.inject({ method: "GET", url: "/api/current-user" });
			const anonymousUserId = anonymous.json().user.id;
			createdUserIds.push(anonymousUserId);
			const anonymousCookie = toCookieHeader(anonymous.headers["set-cookie"]);

			const created = await app.inject({
				method: "POST",
				url: "/api/characters",
				headers: { cookie: anonymousCookie },
				payload: { name: "Codebound Cleric", className: "Cleric", level: 1, maxHp: 9 },
			});
			expect(created.statusCode).toBe(201);

			const email = `code-${Date.now()}@example.test`;
			await app.inject({
				method: "POST",
				url: "/api/magic-link-requests",
				headers: { cookie: anonymousCookie },
				payload: { email },
			});
			const code = await readSignInCode(email);

			const verified = await app.inject({
				method: "POST",
				url: "/api/sign-in-code-verifications",
				headers: { cookie: anonymousCookie },
				payload: { email, code },
			});
			expect(verified.statusCode).toBe(200);
			expect(verified.json()).toEqual({ signedIn: true });
			const signedInCookie = toCookieHeader(verified.headers["set-cookie"]);

			const currentUser = await app.inject({
				method: "GET",
				url: "/api/current-user",
				headers: { cookie: signedInCookie },
			});
			const signedInUser = currentUser.json().user;
			createdUserIds.push(signedInUser.id);
			expect(signedInUser).toMatchObject({ isAnonymous: false, name: email });
			expect(signedInUser.id).not.toBe(anonymousUserId);

			const characters = await app.inject({
				method: "GET",
				url: "/api/characters",
				headers: { cookie: signedInCookie },
			});
			expect(JSON.stringify(characters.json())).toContain("Codebound Cleric");

			const anonymousRows = await getDb()
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.id, anonymousUserId));
			expect(anonymousRows).toEqual([]);

			const reused = await app.inject({
				method: "POST",
				url: "/api/sign-in-code-verifications",
				payload: { email, code },
			});
			expect(reused.statusCode).toBe(401);
		} finally {
			await app.close();
		}
	});

	it("rejects a wrong sign-in code without creating a session", async () => {
		const app = await buildServer();
		try {
			const email = `wrong-code-${Date.now()}@example.test`;
			await app.inject({ method: "POST", url: "/api/magic-link-requests", payload: { email } });
			const code = await readSignInCode(email);
			const wrongCode = code === "000000" ? "111111" : "000000";

			const response = await app.inject({
				method: "POST",
				url: "/api/sign-in-code-verifications",
				payload: { email, code: wrongCode },
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toEqual({ error: "Invalid or expired sign-in code." });
			expect(response.headers["set-cookie"]).toBeUndefined();
		} finally {
			await app.close();
		}
	});

	it("rejects malformed sign-in code bodies", async () => {
		const app = await buildServer();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/sign-in-code-verifications",
				payload: { email: "player@example.com", code: "12ab" },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toEqual({ error: "Invalid request body." });
		} finally {
			await app.close();
		}
	});

	it.each([
		"/api/auth/sign-in/email-otp",
		"/api/auth/email-otp/send-verification-otp",
		"/api/auth/email-otp/check-verification-otp",
		"/api/auth/forget-password/email-otp",
	])("does not expose Better Auth's native email-OTP endpoint %s", async (url) => {
		const app = await buildServer();
		try {
			const response = await app.inject({
				method: "POST",
				url,
				payload: { email: "player@example.com", type: "sign-in", otp: "123456" },
			});

			expect(response.statusCode).toBe(404);
		} finally {
			await app.close();
		}
	});

	it("does not expose Better Auth's native magic-link request endpoint", async () => {
		const app = await buildServer();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/sign-in/magic-link",
				payload: { email: "Player@Example.COM" },
			});

			expect(response.statusCode).toBe(404);

			const rows = await getDb().select({ id: verificationTable.id }).from(verificationTable);
			expect(rows).toEqual([]);
		} finally {
			await app.close();
		}
	});

	it("signs out the current session and allows a new anonymous session", async () => {
		const app = await buildServer();
		try {
			const currentUser = await app.inject({ method: "GET", url: "/api/current-user" });
			expect(currentUser.statusCode).toBe(200);
			const firstUserId = currentUser.json().user.id;
			createdUserIds.push(firstUserId);

			const signOut = await app.inject({
				method: "POST",
				url: "/api/sign-out",
				headers: { cookie: toCookieHeader(currentUser.headers["set-cookie"]) },
			});

			expect(signOut.statusCode).toBe(200);
			expect(signOut.json()).toEqual({ signedOut: true });
			expect(signOut.headers["set-cookie"]).toBeDefined();

			const nextUser = await app.inject({
				method: "GET",
				url: "/api/current-user",
				headers: { cookie: toCookieHeader(signOut.headers["set-cookie"]) },
			});
			expect(nextUser.statusCode).toBe(200);
			const nextUserBody = nextUser.json();
			createdUserIds.push(nextUserBody.user.id);
			expect(nextUserBody.user).toMatchObject({ isAnonymous: true });
			expect(nextUserBody.user.id).not.toBe(firstUserId);
		} finally {
			await app.close();
		}
	});
});

function toCookieHeader(setCookie: string | string[] | undefined) {
	const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
	return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function readSignInCode(email: string) {
	const [row] = await getDb()
		.select({ value: verificationTable.value })
		.from(verificationTable)
		.where(eq(verificationTable.identifier, `sign-in-otp-${email}`));
	if (!row) throw new Error(`Sign-in code not found for ${email}.`);
	return row.value.split(":")[0];
}
