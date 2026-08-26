import { Alert, Box, Button, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	apiMutations,
	apiQueries,
	type CurrentUserResponse,
} from "../generated/api-client.generated.js";

type CurrentUser = CurrentUserResponse["user"];

interface MagicLinkLoginPanelProps {
	currentUser: CurrentUser;
}

interface MagicLinkFormValues {
	email: string;
}

export function MagicLinkLoginPanel({ currentUser }: MagicLinkLoginPanelProps) {
	const queryClient = useQueryClient();
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
	const signOutMutation = useMutation({
		...apiMutations.signOutCurrentUser(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["api"] });
			await queryClient.ensureQueryData(apiQueries.getCurrentUser());
		},
	});

	if (!currentUser.isAnonymous) {
		return (
			<Paper withBorder p="md">
				<Group justify="space-between" align="center">
					<Stack gap={2}>
						<Text fw={600}>{`Signed in as ${currentUser.name}`}</Text>
						<Text c="dimmed" size="sm">
							Your character workspace is connected to this account.
						</Text>
					</Stack>
					<Button
						loading={signOutMutation.isPending}
						onClick={() => signOutMutation.mutate()}
						variant="light"
					>
						Sign out
					</Button>
				</Group>
			</Paper>
		);
	}

	return (
		<Paper withBorder p="md">
			<Stack gap="md">
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
					<Group align="flex-end" wrap="wrap">
						<TextInput
							{...form.getInputProps("email")}
							autoComplete="email"
							flex={1}
							label="Email"
							miw={220}
							placeholder="player@example.com"
							type="email"
							withAsterisk
						/>
						<Button loading={requestMagicLinkMutation.isPending} type="submit">
							Email sign-in link
						</Button>
					</Group>
				</Box>
			</Stack>
		</Paper>
	);
}

export function validateEmail(value: string) {
	const email = value.trim();
	if (email.length === 0) return "Email is required";
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email";
	return null;
}
