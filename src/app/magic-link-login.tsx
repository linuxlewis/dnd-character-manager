import { Alert, Box, Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiMutations, apiQueries } from "../generated/api-client.generated.js";

interface MagicLinkFormValues {
	email: string;
}

interface SignInCodeFormValues {
	code: string;
}

interface MagicLinkLoginFormProps {
	onSignedIn?: () => void;
}

export function MagicLinkLoginForm({ onSignedIn }: MagicLinkLoginFormProps) {
	const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
	const form = useForm<MagicLinkFormValues>({
		mode: "controlled",
		initialValues: { email: "" },
		validate: {
			email: validateEmail,
		},
	});
	const requestMagicLinkMutation = useMutation({
		...apiMutations.requestMagicLinkSignIn(),
		onSuccess: (_response, variables) => {
			setRequestedEmail(variables.email);
			form.reset();
		},
	});

	if (requestedEmail) {
		return (
			<SignInCodeForm
				email={requestedEmail}
				onSignedIn={onSignedIn}
				onUseDifferentEmail={() => {
					requestMagicLinkMutation.reset();
					setRequestedEmail(null);
				}}
			/>
		);
	}

	return (
		<Stack gap="md">
			<Text c="dimmed" size="sm">
				Enter your email and we will send you a sign-in link and a one-time code.
			</Text>
			{requestMagicLinkMutation.error && (
				<Alert color="red" title="Sign-in link unavailable" variant="light">
					Check the email address and try again.
				</Alert>
			)}
			<Box
				component="form"
				onSubmit={form.onSubmit((values) => {
					requestMagicLinkMutation.mutate({ email: values.email.trim() });
				})}
			>
				<Stack gap="sm">
					<TextInput
						{...form.getInputProps("email")}
						autoComplete="email"
						label="Email"
						placeholder="player@example.com"
						type="email"
						withAsterisk
					/>
					<Button loading={requestMagicLinkMutation.isPending} type="submit">
						Email sign-in link
					</Button>
				</Stack>
			</Box>
		</Stack>
	);
}

interface SignInCodeFormProps {
	email: string;
	onSignedIn?: () => void;
	onUseDifferentEmail: () => void;
}

function SignInCodeForm({ email, onSignedIn, onUseDifferentEmail }: SignInCodeFormProps) {
	const queryClient = useQueryClient();
	const form = useForm<SignInCodeFormValues>({
		mode: "controlled",
		initialValues: { code: "" },
		validate: {
			code: validateSignInCode,
		},
	});
	const verifySignInCodeMutation = useMutation({
		...apiMutations.verifySignInCode(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["api"] });
			await queryClient.ensureQueryData(apiQueries.getCurrentUser());
			onSignedIn?.();
		},
	});

	return (
		<Stack gap="md">
			<Alert color="green" title="Sign-in link sent" variant="light">
				We emailed {email}. Open the link, or enter the 6-digit code from the same email below.
			</Alert>
			{verifySignInCodeMutation.error && (
				<Alert color="red" title="Code not accepted" variant="light">
					That code is incorrect or expired. Check the latest email or use a different email.
				</Alert>
			)}
			<Box
				component="form"
				onSubmit={form.onSubmit((values) => {
					verifySignInCodeMutation.mutate({ email, code: normalizeSignInCode(values.code) });
				})}
			>
				<Stack gap="sm">
					<TextInput
						{...form.getInputProps("code")}
						autoComplete="one-time-code"
						description="Enter the code from your email"
						inputMode="numeric"
						label="Sign-in code"
						placeholder="123456"
						withAsterisk
					/>
					<Button loading={verifySignInCodeMutation.isPending} type="submit">
						Sign in with code
					</Button>
				</Stack>
			</Box>
			<Group justify="center">
				<Button onClick={onUseDifferentEmail} size="compact-sm" variant="subtle">
					Use a different email
				</Button>
			</Group>
		</Stack>
	);
}

export function validateEmail(value: string) {
	const email = value.trim();
	if (email.length === 0) return "Email is required";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";
	return null;
}

export function normalizeSignInCode(value: string) {
	return value.replace(/[\s-]/g, "");
}

export function validateSignInCode(value: string) {
	const code = normalizeSignInCode(value);
	if (code.length === 0) return "Code is required";
	if (!/^\d{6}$/.test(code)) return "Enter the 6-digit code";
	return null;
}
