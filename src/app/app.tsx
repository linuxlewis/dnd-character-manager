/**
 * Root application component.
 *
 * Root layout shell. Domain UI modules are composed here as they are added.
 */

import { Alert, Badge, Container, Divider, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useCurrentUser } from "./current-user-provider.js";

export function App() {
	const { currentUser, error, isLoading } = useCurrentUser();
	const sessionLabel = isLoading
		? "Session..."
		: currentUser?.isAnonymous
			? "Anonymous session"
			: "Signed in";

	return (
		<Container size="md" py={{ base: "xl", sm: "calc(var(--mantine-spacing-xl) * 2)" }}>
			<Stack gap="xl">
				<Stack gap="xs">
					<Group gap="sm" align="center">
						<Title order={1} size="h2">
							D&D Character Manager
						</Title>
						<Badge color="candle" variant="light">
							D&D 5e
						</Badge>
						<Badge color={currentUser ? "green" : "gray"} variant="light">
							{sessionLabel}
						</Badge>
					</Group>
					<Text c="dimmed" maw={640}>
						Your character workspace is scoped to this browser session.
					</Text>
				</Stack>
				<Divider />
				{error ? (
					<Alert color="red" title="Session unavailable" variant="light">
						Refresh the page to try again.
					</Alert>
				) : (
					<Paper withBorder p="lg">
						<Stack gap="xs">
							<Title order={2} size="h4">
								Character workspace
							</Title>
							<Text c="dimmed" size="sm">
								Character creation will use the current session when the character domain lands.
							</Text>
							{currentUser && (
								<Text c="dimmed" size="xs">
									Session user {currentUser.id}
								</Text>
							)}
						</Stack>
					</Paper>
				)}
			</Stack>
		</Container>
	);
}
