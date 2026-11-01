import { readFileSync } from "node:fs";
import { z } from "zod";

const OutboxEmailSchema = z.object({
	to: z.string(),
	subject: z.string(),
	text: z.string(),
	html: z.string(),
	sentAt: z.string(),
});

export interface SentSignInEmail {
	code: string;
	link: string;
	subject: string;
	text: string;
}

/**
 * Reads the newest sign-in email sent to `to` from the local stack's email outbox, which the API
 * appends to when `AUTH_EMAIL_OUTBOX_FILE` is set. The code and link come from the email itself.
 */
export function readLatestSignInEmail(to: string): SentSignInEmail {
	const outboxFile = process.env.AUTH_EMAIL_OUTBOX_FILE;
	if (!outboxFile) {
		throw new Error(
			"AUTH_EMAIL_OUTBOX_FILE is required. Run through pnpm test:integration or test:e2e.",
		);
	}

	const recipient = to.trim().toLowerCase();
	const latest = readFileSync(outboxFile, "utf-8")
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => OutboxEmailSchema.parse(JSON.parse(line)))
		.filter((email) => email.to === recipient)
		.at(-1);
	if (!latest) throw new Error(`No sign-in email was sent to ${recipient}.`);

	const code = latest.subject.match(/(\d{6})$/)?.[1];
	const link = latest.text.match(/https?:\/\/\S+\/magic-link\/verify\?\S+/)?.[0];
	if (!code || !link) throw new Error(`Sign-in email to ${recipient} is missing its code or link.`);

	return { code, link, subject: latest.subject, text: latest.text };
}
