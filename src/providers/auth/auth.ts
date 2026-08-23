import { getDb } from "@providers/database/index.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, magicLink } from "better-auth/plugins";
import { handleAnonymousAccountLinked } from "./account-linking.js";
import { sendMagicLink } from "./magic-link.js";
import { authTables } from "./schema.js";

const LOCAL_AUTH_SECRET = "local-development-auth-secret-for-dnd-character-manager";

function createAuth() {
	return betterAuth({
		appName: "D&D Character Manager",
		baseURL: getAuthBaseUrl(),
		database: drizzleAdapter(getDb(), {
			provider: "pg",
			schema: authTables,
		}),
		secret: getAuthSecret(),
		session: {
			expiresIn: 60 * 60 * 24 * 30,
			updateAge: 60 * 60 * 24,
		},
		advanced: {
			database: {
				generateId: "uuid",
			},
		},
		plugins: [
			anonymous({
				onLinkAccount: async ({ anonymousUser, newUser }) => {
					await handleAnonymousAccountLinked({
						anonymousUserId: anonymousUser.user.id,
						linkedUserId: newUser.user.id,
					});
				},
			}),
			magicLink({
				sendMagicLink: (delivery) => sendMagicLink(delivery),
			}),
		],
		trustedOrigins: getTrustedOrigins(),
	});
}

export type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | null = null;

export function getAuth() {
	authInstance ??= createAuth();
	return authInstance;
}

export function getAuthSecret() {
	const secret = process.env.BETTER_AUTH_SECRET;
	if (secret) return secret;
	if (process.env.NODE_ENV === "production") {
		throw new Error("BETTER_AUTH_SECRET is required in production.");
	}
	return LOCAL_AUTH_SECRET;
}

export function getAuthBaseUrl() {
	return (
		process.env.BETTER_AUTH_URL ??
		`http://${process.env.HOST ?? "127.0.0.1"}:${process.env.PORT ?? 4000}`
	);
}

export function getTrustedOrigins() {
	return (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
		.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);
}

export function resetAuthForTest() {
	authInstance = null;
}
