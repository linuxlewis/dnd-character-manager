import { SIGN_IN_EMAIL_EXPIRES_IN_SECONDS } from "./magic-link-types.js";

export interface SignInEmailInput {
	code: string;
	url: string;
}

export interface SignInEmailContent {
	html: string;
	subject: string;
	text: string;
}

// Brand colors mirror the landing page tokens in src/app/theme.css (.landing-shell) and the
// bloodstone/candle palettes in src/app/theme.ts. Email clients do not support rgba reliably, so
// the landing page's translucent muted text and borders are flattened onto the surface color.
const colors = {
	ink: "#101113",
	surface: "#191b20",
	raised: "#24272e",
	paper: "#f3efe5",
	mutedPaper: "#b6b4ae",
	border: "#34363b",
	blood: "#f43f5e",
	candle: "#ffca28",
	buttonText: "#08090a",
} as const;

const fontStack =
	"Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const monoStack = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', 'Courier New', monospace";
const codeLetterSpacingPx = 10;
const expiresInMinutes = SIGN_IN_EMAIL_EXPIRES_IN_SECONDS / 60;

export function buildSignInEmail(input: SignInEmailInput): SignInEmailContent {
	return {
		subject: `Your D&D Character Manager sign-in code: ${input.code}`,
		html: buildSignInEmailHtml(input),
		text: buildSignInEmailText(input),
	};
}

export function buildSignInEmailText({ code, url }: SignInEmailInput) {
	return [
		"Sign in to D&D Character Manager",
		"",
		"Your sign-in code:",
		"",
		`    ${code}`,
		"",
		"Enter this code in the app. It works even when you use the app from your home screen.",
		"",
		"Or open this link on this device to sign in:",
		"",
		url,
		"",
		`The code and link expire in ${expiresInMinutes} minutes and work once.`,
		"If you did not request this email, you can ignore it.",
	].join("\n");
}

export function buildSignInEmailHtml({ code, url }: SignInEmailInput) {
	const escapedCode = escapeHtml(code);
	const escapedUrl = escapeHtml(url);
	const paragraph = `margin:0;font-family:${fontStack};font-size:16px;line-height:24px;color:${colors.mutedPaper};`;
	const smallParagraph = `margin:0;font-family:${fontStack};font-size:13px;line-height:20px;color:${colors.mutedPaper};`;

	return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Sign in to D&amp;D Character Manager</title>
</head>
<body style="margin:0;padding:0;background-color:${colors.ink};" bgcolor="${colors.ink}">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${colors.ink};opacity:0;">Your sign-in code is ${escapedCode}. It expires in ${expiresInMinutes} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.ink}" style="background-color:${colors.ink};">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${colors.surface}" style="max-width:480px;background-color:${colors.surface};border:1px solid ${colors.border};border-radius:4px;">
<tr>
<td height="4" bgcolor="${colors.blood}" style="height:4px;background-color:${colors.blood};font-size:0;line-height:0;border-radius:4px 4px 0 0;">&nbsp;</td>
</tr>
<tr>
<td style="padding:28px 32px 0;">
<p style="margin:0 0 8px;font-family:${fontStack};font-size:12px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${colors.candle};">D&amp;D Character Manager</p>
<h1 style="margin:0 0 12px;font-family:${fontStack};font-size:24px;line-height:32px;font-weight:700;color:${colors.paper};">Your sign-in code</h1>
<p style="${paragraph}">Enter this code in the app to sign in. It works even when you use the app from your home screen.</p>
</td>
</tr>
<tr>
<td style="padding:20px 32px 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" bgcolor="${colors.raised}" style="background-color:${colors.raised};border:2px solid ${colors.candle};border-radius:4px;padding:20px 12px 20px ${12 + codeLetterSpacingPx}px;">
<span style="font-family:${monoStack};font-size:40px;line-height:48px;font-weight:700;letter-spacing:${codeLetterSpacingPx}px;color:${colors.paper};mso-line-height-rule:exactly;">${escapedCode}</span>
</td>
</tr>
</table>
<p style="${smallParagraph}padding-top:10px;text-align:center;">Expires in ${expiresInMinutes} minutes. Works once.</p>
</td>
</tr>
<tr>
<td style="padding:28px 32px 0;">
<p style="${paragraph}">Or sign in with one tap on this device:</p>
</td>
</tr>
<tr>
<td style="padding:14px 32px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr>
<td align="center" bgcolor="${colors.blood}" style="background-color:${colors.blood};border-radius:4px;">
<a href="${escapedUrl}" target="_blank" style="display:inline-block;padding:14px 24px;font-family:${fontStack};font-size:16px;line-height:20px;font-weight:800;color:${colors.buttonText};text-decoration:none;border-radius:4px;">Sign in with link</a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:28px 32px 32px;">
<p style="${smallParagraph}padding-bottom:12px;">If the button does not work, copy this link into your browser:<br><a href="${escapedUrl}" target="_blank" style="color:${colors.candle};text-decoration:underline;word-break:break-all;">${escapedUrl}</a></p>
<p style="${smallParagraph}">If you did not request this email, you can ignore it.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
