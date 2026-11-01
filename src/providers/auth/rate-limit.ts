import type { FastifyReply, FastifyRequest } from "fastify";
import { signInRateLimitedMessage } from "./magic-link-types.js";

export interface RateLimitRule {
	limit: number;
	windowMs: number;
}

interface RateLimitWindow {
	count: number;
	resetAt: number;
}

const fifteenMinutes = 15 * 60 * 1000;

/**
 * Per-email and per-client-IP limits for the app-owned sign-in routes. Better Auth's own HTTP rate
 * limiter does not apply because these routes call `auth.api` server-side.
 */
export const signInRateLimitRules = {
	emailRequests: {
		byEmail: { limit: 5, windowMs: fifteenMinutes },
		byIp: { limit: 20, windowMs: fifteenMinutes },
	},
	codeVerifications: {
		byEmail: { limit: 10, windowMs: fifteenMinutes },
		byIp: { limit: 30, windowMs: fifteenMinutes },
	},
} as const satisfies Record<string, { byEmail: RateLimitRule; byIp: RateLimitRule }>;

type SignInRateLimitedRoute = keyof typeof signInRateLimitRules;

/** In-memory fixed-window counter. Production runs a single app container, so memory is enough. */
export function createRateLimiter(rule: RateLimitRule, now: () => number = Date.now) {
	const windows = new Map<string, RateLimitWindow>();

	return {
		/** Counts one attempt and returns seconds until retry when the key is over its limit. */
		consume(key: string): number | null {
			const current = now();
			if (windows.size > 10_000) pruneExpired(windows, current);

			const window = windows.get(key);
			if (!window || window.resetAt <= current) {
				windows.set(key, { count: 1, resetAt: current + rule.windowMs });
				return null;
			}

			window.count += 1;
			if (window.count <= rule.limit) return null;
			return Math.ceil((window.resetAt - current) / 1000);
		},
	};
}

export function createSignInRateLimiter() {
	const limiters = Object.fromEntries(
		Object.entries(signInRateLimitRules).map(([route, rules]) => [
			route,
			{ byEmail: createRateLimiter(rules.byEmail), byIp: createRateLimiter(rules.byIp) },
		]),
	) as Record<
		SignInRateLimitedRoute,
		Record<"byEmail" | "byIp", ReturnType<typeof createRateLimiter>>
	>;

	return {
		/** Sends a 429 and returns true when either the email or the client IP is over its limit. */
		reject(
			route: SignInRateLimitedRoute,
			email: string,
			request: FastifyRequest,
			reply: FastifyReply,
		): boolean {
			const emailRetryAfter = limiters[route].byEmail.consume(email);
			const ipRetryAfter = limiters[route].byIp.consume(getClientIp(request));
			const retryAfter = Math.max(emailRetryAfter ?? 0, ipRetryAfter ?? 0);
			if (retryAfter === 0) return false;

			reply.header("retry-after", String(retryAfter));
			reply.status(429).send({ error: signInRateLimitedMessage });
			return true;
		},
	};
}

export type SignInRateLimiter = ReturnType<typeof createSignInRateLimiter>;

/**
 * Production traffic reaches the app through Cloudflare Tunnel and Docker, so `request.ip` is the
 * same proxy address for everyone. `AUTH_CLIENT_IP_HEADER` names the trusted header that carries the
 * real client address (`cf-connecting-ip` in production).
 */
export function getClientIp(request: FastifyRequest, env: NodeJS.ProcessEnv = process.env) {
	const headerName = env.AUTH_CLIENT_IP_HEADER?.trim().toLowerCase();
	const headerValue = headerName ? request.headers[headerName] : undefined;
	const forwarded = Array.isArray(headerValue) ? headerValue[0] : headerValue;
	return forwarded?.trim() || request.ip;
}

function pruneExpired(windows: Map<string, RateLimitWindow>, current: number) {
	for (const [key, window] of windows) {
		if (window.resetAt <= current) windows.delete(key);
	}
}
