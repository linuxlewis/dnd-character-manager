import { Alert, Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ApiClientError, apiQueries } from "../../../generated/api-client.generated.js";
import { characterRoutePath, shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";
import { CharacterHealthPanel } from "./health-panel.js";

interface CharacterDetailProps {
	id: string;
	onNavigate: NavigateToCharacterRoute;
}

export function CharacterDetail({ id, onNavigate }: CharacterDetailProps) {
	const characterQuery = useQuery(apiQueries.getCharacter({ characterId: id }));

	return (
		<Stack gap="lg">
			<Group justify="space-between" align="center">
				<Title order={2}>Character details</Title>
				<BackToListButton onNavigate={onNavigate} />
			</Group>

			{characterQuery.isLoading && (
				<Paper withBorder p="lg">
					<Text c="dimmed">Loading character...</Text>
				</Paper>
			)}

			{isNotFound(characterQuery.error) && (
				<Alert color="yellow" title="Character not found" variant="light">
					<Text size="sm">This character is not available in the current session.</Text>
				</Alert>
			)}

			{characterQuery.error && !isNotFound(characterQuery.error) && (
				<Alert color="red" title="Character unavailable" variant="light">
					Refresh the page to try again.
				</Alert>
			)}

			{characterQuery.data && (
				<Paper withBorder p="lg">
					<Stack gap="md">
						<Title order={3}>{characterQuery.data.character.name}</Title>
						<Group gap="xs">
							<Badge variant="light">{characterQuery.data.character.className}</Badge>
							<Badge color="candle" variant="light">
								Level {characterQuery.data.character.level}
							</Badge>
						</Group>
						<CharacterHealthPanel
							characterId={characterQuery.data.character.id}
							health={characterQuery.data.character.health}
							recentHealthChanges={characterQuery.data.character.recentHealthChanges}
						/>
					</Stack>
				</Paper>
			)}
		</Stack>
	);
}

function BackToListButton({ onNavigate }: { onNavigate: NavigateToCharacterRoute }) {
	return (
		<Button
			component="a"
			href={characterRoutePath({ screen: "list" })}
			onClick={(event) => {
				if (!shouldHandleCharacterLink(event)) return;
				event.preventDefault();
				onNavigate({ screen: "list" });
			}}
			variant="subtle"
		>
			Back to characters
		</Button>
	);
}

function isNotFound(error: Error | null) {
	return error instanceof ApiClientError && error.status === 404;
}
