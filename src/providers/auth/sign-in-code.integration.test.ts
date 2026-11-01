import { resetAuthForTest } from "@providers/auth/auth.js";
import { userTable, verificationTable } from "@providers/auth/schema.js";
import { closeDb, getDb } from "@providers/database/index.js";
import { eq, inArray } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { readLatestSignInEmail } from "../../../tests/support/email-outbox.js";
import { buildServer } from "../../app-server.js";

type App = Awaited<ReturnType<typeof buildServer>>;

const createdUserIds: string[] = [];
const originalClientIpHeader = process.env.AUTH_CLIENT_IP_HEADER;

afterEach(async () => {
	if (originalClientIpHeader === undefined) delete process.env.AUTH_CLIENT_IP_HEADER;
	else process.env.AUTH_CLIENT_IP_HEADER = originalClientIpHeader;
	resetAuthForTest();
	if (createdUserIds.length > 0) {
		await getDb()
			.delete(userTable)
			.where(inArray(userTable.id, [...createdUserIds]));
		createdUserIds.length = 0;
	}
	await closeDb();
});

describe("sign-in code verification", () => {
	it("signs in with the emailed code and keeps the anonymous session's characters", async () => {
		const email = uniqueEmail("coder");
		const app = await buildServer();
		try {
			const anonymous = await startAnonymousSession(app);
			await createCharacter(app, anonymous.cookie, "Codebound Cleric");

			await requestSignInEmail(app, email.toUpperCase(), anonymous.cookie);
			const { code } = readLatestSignInEmail(email);

			const verified = await verifyCode(app, email, code, anonymous.cookie);
			expect(verified.statusCode).toBe(200);
			expect(verified.json()).toEqual({ signedIn: true });
			const cookie = toCookieHeader(verified.headers["set-cookie"]);

			const user = await currentUser(app, cookie);
			expect(user).toMatchObject({ isAnonymous: false, name: email });
			expect(user.id).not.toBe(anonymous.userId);
			expect(await listCharacterNames(app, cookie)).toEqual(["Codebound Cleric"]);

			const anonymousRows = await getDb()
				.select({ id: userTable.id })
				.from(userTable)
				.where(eq(userTable.id, anonymous.userId));
			expect(anonymousRows).toEqual([]);

			expect((await verifyCode(app, email, code)).statusCode).toBe(401);
		} finally {
			await app.close();
		}
	});

	it("adds a returning account's new anonymous characters when signing in by code", async () => {
		const email = uniqueEmail("returning-code");
		const app = await buildServer();
		try {
			await createAccountWithCharacter(app, email, "Veteran Paladin");

			const anonymous = await startAnonymousSession(app);
			await createCharacter(app, anonymous.cookie, "Fresh Rogue");
			await requestSignInEmail(app, email, anonymous.cookie);
			const verified = await verifyCode(
				app,
				email,
				readLatestSignInEmail(email).code,
				anonymous.cookie,
			);
			expect(verified.statusCode).toBe(200);

			const cookie = toCookieHeader(verified.headers["set-cookie"]);
			expect(await listCharacterNames(app, cookie)).toEqual(["Fresh Rogue", "Veteran Paladin"]);
		} finally {
			await app.close();
		}
	});

	it("adds a returning account's new anonymous characters when signing in by link", async () => {
		const email = uniqueEmail("returning-link");
		const app = await buildServer();
		try {
			await createAccountWithCharacter(app, email, "Veteran Paladin");

			const anonymous = await startAnonymousSession(app);
			await createCharacter(app, anonymous.cookie, "Fresh Rogue");
			await requestSignInEmail(app, email, anonymous.cookie);
			const link = new URL(readLatestSignInEmail(email).link);
			const verified = await app.inject({
				method: "GET",
				url: `${link.pathname}${link.search}`,
				headers: { cookie: anonymous.cookie },
			});
			expect(verified.statusCode).toBe(302);

			const cookie = toCookieHeader(verified.headers["set-cookie"]);
			expect(await listCharacterNames(app, cookie)).toEqual(["Fresh Rogue", "Veteran Paladin"]);
		} finally {
			await app.close();
		}
	});

	it("rejects a wrong code without creating a session", async () => {
		const email = uniqueEmail("wrong-code");
		const app = await buildServer();
		try {
			await requestSignInEmail(app, email);
			const response = await verifyCode(app, email, otherCode(readLatestSignInEmail(email).code));

			expect(response.statusCode).toBe(401);
			expect(response.json()).toEqual({ error: "Invalid or expired sign-in code." });
			expect(response.headers["set-cookie"]).toBeUndefined();
		} finally {
			await app.close();
		}
	});

	it("rejects the correct code after three wrong attempts", async () => {
		const email = uniqueEmail("attempts");
		const app = await buildServer();
		try {
			await requestSignInEmail(app, email);
			const { code } = readLatestSignInEmail(email);

			for (let attempt = 1; attempt <= 3; attempt++) {
				expect((await verifyCode(app, email, otherCode(code))).statusCode).toBe(401);
			}

			expect((await verifyCode(app, email, code)).statusCode).toBe(401);
		} finally {
			await app.close();
		}
	});

	it("rejects an expired code", async () => {
		const email = uniqueEmail("expired");
		const app = await buildServer();
		try {
			await requestSignInEmail(app, email);
			const { code } = readLatestSignInEmail(email);
			await getDb()
				.update(verificationTable)
				.set({ expiresAt: new Date(Date.now() - 1000) })
				.where(eq(verificationTable.identifier, `sign-in-otp-${email}`));

			expect((await verifyCode(app, email, code)).statusCode).toBe(401);
		} finally {
			await app.close();
		}
	});

	it("rejects malformed bodies", async () => {
		const app = await buildServer();
		try {
			const response = await verifyCode(app, "player@example.com", "12ab");

			expect(response.statusCode).toBe(400);
			expect(response.json()).toEqual({ error: "Invalid request body." });
		} finally {
			await app.close();
		}
	});

	it("limits code attempts per client IP from the trusted proxy header", async () => {
		process.env.AUTH_CLIENT_IP_HEADER = "cf-connecting-ip";
		const app = await buildServer();
		try {
			const fromIp = (ip: string) =>
				app.inject({
					method: "POST",
					url: "/api/sign-in-code-verifications",
					headers: { "cf-connecting-ip": ip },
					payload: { email: uniqueEmail("guess"), code: "123456" },
				});

			for (let attempt = 1; attempt <= 30; attempt++) {
				expect((await fromIp("203.0.113.7")).statusCode).toBe(401);
			}

			const limited = await fromIp("203.0.113.7");
			expect(limited.statusCode).toBe(429);
			expect(limited.json()).toEqual({
				error: "Too many sign-in attempts. Wait a few minutes and try again.",
			});
			expect((await fromIp("198.51.100.4")).statusCode).toBe(401);
		} finally {
			await app.close();
		}
	});
});

async function createAccountWithCharacter(app: App, email: string, characterName: string) {
	const anonymous = await startAnonymousSession(app);
	await createCharacter(app, anonymous.cookie, characterName);
	await requestSignInEmail(app, email, anonymous.cookie);
	const verified = await verifyCode(
		app,
		email,
		readLatestSignInEmail(email).code,
		anonymous.cookie,
	);
	expect(verified.statusCode).toBe(200);

	const user = await currentUser(app, toCookieHeader(verified.headers["set-cookie"]));
	createdUserIds.push(user.id);
}

async function startAnonymousSession(app: App) {
	const response = await app.inject({ method: "GET", url: "/api/current-user" });
	const userId: string = response.json().user.id;
	createdUserIds.push(userId);
	return { cookie: toCookieHeader(response.headers["set-cookie"]), userId };
}

async function createCharacter(app: App, cookie: string, name: string) {
	const response = await app.inject({
		method: "POST",
		url: "/api/characters",
		headers: { cookie },
		payload: { name, className: "Cleric", level: 1, maxHp: 9 },
	});
	expect(response.statusCode).toBe(201);
}

async function requestSignInEmail(app: App, email: string, cookie?: string) {
	const response = await app.inject({
		method: "POST",
		url: "/api/magic-link-requests",
		headers: cookie ? { cookie } : {},
		payload: { email },
	});
	expect(response.statusCode).toBe(202);
}

function verifyCode(app: App, email: string, code: string, cookie?: string) {
	return app.inject({
		method: "POST",
		url: "/api/sign-in-code-verifications",
		headers: cookie ? { cookie } : {},
		payload: { email, code },
	});
}

async function currentUser(app: App, cookie: string) {
	const response = await app.inject({
		method: "GET",
		url: "/api/current-user",
		headers: { cookie },
	});
	const user: { id: string; isAnonymous: boolean; name: string } = response.json().user;
	createdUserIds.push(user.id);
	return user;
}

async function listCharacterNames(app: App, cookie: string) {
	const response = await app.inject({ method: "GET", url: "/api/characters", headers: { cookie } });
	const characters: { name: string }[] = response.json().characters;
	return characters.map((character) => character.name).sort();
}

function otherCode(code: string) {
	return code === "000000" ? "111111" : "000000";
}

function uniqueEmail(prefix: string) {
	return `${prefix}-${crypto.randomUUID()}@example.test`;
}

function toCookieHeader(setCookie: string | string[] | undefined) {
	const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
	return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
