import { Alert, Box, Button, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation } from "@tanstack/react-query";
import { apiMutations } from "../generated/api-client.generated.js";

interface MagicLinkFormValues {
	email: string;
}

export function MagicLinkLoginForm() {
	const form = useForm<MagicLinkFormValues>({
		mode: "controlled",
		initialValues: { email: "" },
		validate: {
			email: validateEmail,
		},
	});
	const requestMagicLinkMutation = useMutation({
		...apiMutations.requestMagicLinkSignIn(),
		onSuccess: () => {
			form.reset();
		},
	});

	return (
		<Stack gap="md">
			<Text c="dimmed" size="sm">
				Enter your email and we will send you a link that signs you in.
			</Text>
			{requestMagicLinkMutation.isSuccess && (
				<Alert color="green" title="Sign-in link sent" variant="light">
					Open the link to finish signing in.
				</Alert>
			)}
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

export function validateEmail(value: string) {
	const email = value.trim();
	if (email.length === 0) return "Email is required";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";
	return null;
}
