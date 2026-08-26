import { fromNodeHeaders } from "better-auth/node";
import type { FastifyReply, FastifyRequest } from "fastify";
import { Resend } from "resend";
import { z } from "zod";
import { createLogger, type Logger } from "../telemetry/index.js";
import { getAuth } from "./auth.js";
import { type MagicLinkRequestResponse, MagicLinkRequestSchema } from "./magic-link-types.js";

export interface MagicLinkDelivery {
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
const magicLinkSubject = "Your D&D Character Manager sign-in link";

export async function sendMagicLinkWithLogger(
	delivery: MagicLinkDelivery,
	logger: Pick<Logger, "info"> = magicLinkLogger,
	env: MagicLinkDeliveryEnv = process.env,
) {
	if (!isLogDeliveryEnabled(env)) {
		throw new Error("Magic link log delivery is disabled in production.");
	}

	logger.info(
		{
			email: delivery.email,
			magicLinkUrl: delivery.url,
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
		const { error } = await client.send({
			from: config.fromEmail,
			to: [delivery.email],
			subject: magicLinkSubject,
			html: buildMagicLinkHtmlEmail(delivery.url),
			text: buildMagicLinkTextEmail(delivery.url),
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
		return;
	}

	const config = getResendMagicLinkConfig(env);
	const createResendClient = dependencies.createResendClient ?? createDefaultResendClient;
	await createResendMagicLinkSender(config, createResendClient(config))(delivery);
}

export function getMagicLinkDisplayName(email: string) {
	return email;
}

export async function requestMagicLinkSignIn(request: FastifyRequest, reply: FastifyReply) {
	const result = MagicLinkRequestSchema.safeParse(request.body);
	if (!result.success) {
		return reply.status(400).send({ error: "Invalid request body." });
	}

	await getAuth().api.signInMagicLink({
		body: {
			email: result.data.email,
			name: getMagicLinkDisplayName(result.data.email),
			callbackURL: "/",
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

function buildMagicLinkTextEmail(url: string) {
	return [
		"Open this link to sign in to D&D Character Manager:",
		"",
		url,
		"",
		"If you did not request this link, you can ignore this email.",
	].join("\n");
}

function buildMagicLinkHtmlEmail(url: string) {
	const escapedUrl = escapeHtml(url);
	return [
		"<p>Open this link to sign in to D&amp;D Character Manager:</p>",
		`<p><a href="${escapedUrl}">Sign in to D&amp;D Character Manager</a></p>`,
		`<p>${escapedUrl}</p>`,
		"<p>If you did not request this link, you can ignore this email.</p>",
	].join("");
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
