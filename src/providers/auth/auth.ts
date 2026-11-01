import { getDb } from "@providers/database/index.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous, emailOTP, magicLink } from "better-auth/plugins";
import { handleAnonymousAccountLinked } from "./account-linking.js";
import { sendMagicLink } from "./magic-link.js";
import { authTables } from "./schema.js";
import { SIGN_IN_EMAIL_EXPIRES_IN_SECONDS } from "./sign-in-email.js";

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
				expiresIn: SIGN_IN_EMAIL_EXPIRES_IN_SECONDS,
				sendMagicLink: async (delivery) => {
					await sendMagicLink({ ...delivery, code: await createSignInCode(delivery.email) });
				},
			}),
			emailOTP({
				allowedAttempts: 3,
				expiresIn: SIGN_IN_EMAIL_EXPIRES_IN_SECONDS,
				otpLength: 6,
				sendVerificationOTP: rejectStandaloneSignInCodeDelivery,
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

/**
 * Creates the email-OTP sign-in code that rides along in the magic-link email. The code lets an
 * installed home-screen app sign in even when the platform opens the emailed link in a separate
 * browser with its own cookie jar.
 */
async function createSignInCode(email: string): Promise<string> {
	return getAuth().api.createVerificationOTP({ body: { email, type: "sign-in" } });
}

export async function rejectStandaloneSignInCodeDelivery(): Promise<void> {
	throw new Error("Sign-in codes are only delivered inside the magic-link sign-in email.");
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
