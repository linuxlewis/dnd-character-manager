import { appendFileSync } from "node:fs";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Resend } from "resend";
import { z } from "zod";
import { createLogger, type Logger } from "../telemetry/index.js";
import { getAuth } from "./auth.js";
import { type MagicLinkRequestResponse, MagicLinkRequestSchema } from "./magic-link-types.js";
import type { SignInRateLimiter } from "./rate-limit.js";
import { buildSignInEmail } from "./sign-in-email.js";

/** One sign-in email carries both the magic link and a one-time code for the same address. */
export interface MagicLinkDelivery {
	code: string;
	email: string;
	token: string;
	url: string;
}

type MagicLinkDeliveryEnv = Readonly<Record<string, string | undefined>>;
type MagicLinkDeliveryMode = "log" | "resend";

export interface ResendMagicLinkConfig {
	apiKey: string;
	fromEmail: string;
	replyToEmail?: string;
}

export type ResendEmailClient = Pick<Resend["emails"], "send">;

export interface MagicLinkSenderDependencies {
	env?: MagicLinkDeliveryEnv;
	logger?: Pick<Logger, "info">;
	createResendClient?: (config: ResendMagicLinkConfig) => ResendEmailClient;
}

const ResendMagicLinkConfigSchema = z.object({
	apiKey: z.string().trim().min(1, "RESEND_API_KEY is required for Resend magic-link delivery."),
	fromEmail: z
		.string()
		.trim()
		.pipe(z.email("RESEND_FROM_EMAIL is required for Resend magic-link delivery.")),
	replyToEmail: z.email().optional(),
});

const magicLinkLogger = createLogger("auth.magic-link");

export async function sendMagicLinkWithLogger(
	delivery: MagicLinkDelivery,
	logger: Pick<Logger, "info"> = magicLinkLogger,
	env: MagicLinkDeliveryEnv = process.env,
) {
	if (!isLogDeliveryEnabled(env)) {
		throw new Error("Magic link log delivery is disabled in production.");
	}

	// Production log delivery is an explicit opt-in for the link only; codes never reach those logs.
	const signInCode = env.NODE_ENV === "production" ? {} : { signInCode: delivery.code };
	logger.info(
		{
			email: delivery.email,
			magicLinkUrl: delivery.url,
			...signInCode,
		},
		"Magic link login URL generated",
	);
}

export function isLogDeliveryEnabled(env: MagicLinkDeliveryEnv = process.env) {
	return env.NODE_ENV !== "production" || env.MAGIC_LINK_ENABLE_LOG_DELIVERY === "true";
}

export function getMagicLinkDeliveryMode(
	env: MagicLinkDeliveryEnv = process.env,
): MagicLinkDeliveryMode {
	const mode = env.MAGIC_LINK_DELIVERY?.trim().toLowerCase();
	if (!mode) {
		if (env.NODE_ENV === "production") {
			throw new Error("MAGIC_LINK_DELIVERY is required in production.");
		}
		return "log";
	}
	if (mode === "log" || mode === "resend") return mode;
	throw new Error("MAGIC_LINK_DELIVERY must be either log or resend.");
}

export function getResendMagicLinkConfig(
	env: MagicLinkDeliveryEnv = process.env,
): ResendMagicLinkConfig {
	const apiKey = optionalEnvValue(env.RESEND_API_KEY);
	const fromEmail = optionalEnvValue(env.RESEND_FROM_EMAIL);
	if (!apiKey) {
		throw new Error("RESEND_API_KEY is required for Resend magic-link delivery.");
	}
	if (!fromEmail) {
		throw new Error("RESEND_FROM_EMAIL is required for Resend magic-link delivery.");
	}

	const result = ResendMagicLinkConfigSchema.safeParse({
		apiKey,
		fromEmail,
		replyToEmail: optionalEnvValue(env.RESEND_REPLY_TO_EMAIL),
	});
	if (!result.success) {
		throw new Error(result.error.issues[0]?.message ?? "Invalid Resend magic-link configuration.");
	}
	return result.data;
}

export function createResendMagicLinkSender(
	config: ResendMagicLinkConfig,
	client: ResendEmailClient,
) {
	return async (delivery: MagicLinkDelivery) => {
		const email = buildSignInEmail({ code: delivery.code, url: delivery.url });
		const { error } = await client.send({
			from: config.fromEmail,
			to: [delivery.email],
			subject: email.subject,
			html: email.html,
			text: email.text,
			replyTo: config.replyToEmail,
		});

		if (error) {
			throw new Error(`Resend magic-link delivery failed: ${error.message}`);
		}
	};
}

export async function sendMagicLink(
	delivery: MagicLinkDelivery,
	dependencies: MagicLinkSenderDependencies = {},
) {
	const env = dependencies.env ?? process.env;
	const mode = getMagicLinkDeliveryMode(env);
	if (mode === "log") {
		await sendMagicLinkWithLogger(delivery, dependencies.logger ?? magicLinkLogger, env);
	}

	if (mode === "resend") {
		const config = getResendMagicLinkConfig(env);
		const createResendClient = dependencies.createResendClient ?? createDefaultResendClient;
		await createResendMagicLinkSender(config, createResendClient(config))(delivery);
	}
	recordOutboxEmail(delivery, env);
}

/**
 * Local stacks set `AUTH_EMAIL_OUTBOX_FILE` so integration and browser tests can read the sign-in
 * email that was sent (see tests/support/email-outbox.ts). Never written in production.
 */
function recordOutboxEmail(delivery: MagicLinkDelivery, env: MagicLinkDeliveryEnv) {
	const outboxFile = optionalEnvValue(env.AUTH_EMAIL_OUTBOX_FILE);
	if (!outboxFile || env.NODE_ENV === "production") return;

	const email = buildSignInEmail({ code: delivery.code, url: delivery.url });
	const message = { to: delivery.email, ...email, sentAt: new Date().toISOString() };
	appendFileSync(outboxFile, `${JSON.stringify(message)}\n`);
}

export function getMagicLinkDisplayName(email: string) {
	return email;
}

export async function requestMagicLinkSignIn(
	request: FastifyRequest,
	reply: FastifyReply,
	rateLimiter: SignInRateLimiter,
) {
	const result = MagicLinkRequestSchema.safeParse(request.body);
	if (!result.success) {
		return reply.status(400).send({ error: "Invalid request body." });
	}
	if (rateLimiter.reject("emailRequests", result.data.email, request, reply)) return reply;

	await getAuth().api.signInMagicLink({
		body: {
			email: result.data.email,
			name: getMagicLinkDisplayName(result.data.email),
			callbackURL: "/characters",
		},
		headers: fromNodeHeaders(request.headers),
	});

	return reply.status(202).send({ status: "sent" } satisfies MagicLinkRequestResponse);
}

function createDefaultResendClient(config: ResendMagicLinkConfig): ResendEmailClient {
	return new Resend(config.apiKey).emails;
}

function optionalEnvValue(value: string | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}
