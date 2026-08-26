import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable, verificationTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { inArray } from "drizzle-orm";
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
			const emailValues = rows.map((row) => JSON.parse(row.value).email);

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
