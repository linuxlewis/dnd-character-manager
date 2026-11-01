import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable, verificationTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray, like } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { readLatestSignInEmail } from "../../../tests/support/email-outbox.js";
import { buildServer } from "../../app-server.js";

const createdUserIds: string[] = [];

afterEach(async () => {
	resetAuthForTest();
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
	await closeDb();
});

describe("auth routes", () => {
	it("sends one sign-in email with a code and link to the normalized address", async () => {
		const email = uniqueEmail("player");
		const app = await buildServer();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/magic-link-requests",
				payload: { email: ` ${email.toUpperCase()} ` },
			});

			expect(response.statusCode).toBe(202);
			expect(response.json()).toEqual({ status: "sent" });

			const sent = readLatestSignInEmail(email);
			expect(sent.code).toMatch(/^\d{6}$/);
			expect(sent.link).toContain("/api/auth/magic-link/verify?token=");
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

	it("does not expose Better Auth's native magic-link request endpoint", async () => {
		const email = uniqueEmail("native");
		const app = await buildServer();
		try {
			const response = await app.inject({
				method: "POST",
				url: "/api/auth/sign-in/magic-link",
				payload: { email },
			});

			expect(response.statusCode).toBe(404);

			const rows = await getDb()
				.select({ id: verificationTable.id })
				.from(verificationTable)
				.where(like(verificationTable.value, `%${email}%`));
			expect(rows).toEqual([]);
		} finally {
			await app.close();
		}
	});

	it("does not expose Better Auth's native email-OTP endpoints", async () => {
		const app = await buildServer();
		try {
			for (const url of [
				"/api/auth/sign-in/email-otp",
				"/api/auth/email-otp/send-verification-otp",
				"/api/auth/email-otp/check-verification-otp",
				"/api/auth/forget-password/email-otp",
			]) {
				const response = await app.inject({
					method: "POST",
					url,
					payload: { email: "player@example.com", type: "sign-in", otp: "123456" },
				});

				expect(response.statusCode, url).toBe(404);
			}
		} finally {
			await app.close();
		}
	});

	it("limits sign-in emails per address", async () => {
		const email = uniqueEmail("limited");
		const app = await buildServer();
		try {
			for (let attempt = 1; attempt <= 5; attempt++) {
				const allowed = await app.inject({
					method: "POST",
					url: "/api/magic-link-requests",
					payload: { email },
				});
				expect(allowed.statusCode).toBe(202);
			}

			const limited = await app.inject({
				method: "POST",
				url: "/api/magic-link-requests",
				payload: { email },
			});

			expect(limited.statusCode).toBe(429);
			expect(limited.json()).toEqual({
				error: "Too many sign-in attempts. Wait a few minutes and try again.",
			});
			expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0);
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

function uniqueEmail(prefix: string) {
	return `${prefix}-${crypto.randomUUID()}@example.test`;
}

function toCookieHeader(setCookie: string | string[] | undefined) {
	const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
	return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
