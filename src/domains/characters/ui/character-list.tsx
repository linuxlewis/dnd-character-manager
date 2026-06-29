import { Alert, Anchor, Badge, Button, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { apiQueries } from "../../../generated/api-client.generated.js";
import type { CharacterSummary } from "../types/index.js";
import { characterRoutePath, shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";

interface CharacterListProps {
	onNavigate: NavigateToCharacterRoute;
}

export function CharacterList({ onNavigate }: CharacterListProps) {
	const charactersQuery = useQuery(apiQueries.listCharacters());

	return (
		<Stack gap="lg">
			<Group justify="space-between" align="center">
				<Title order={2}>Characters</Title>
				<Button
					component="a"
					href={characterRoutePath({ screen: "create" })}
					onClick={(event) => {
						if (!shouldHandleCharacterLink(event)) return;
						event.preventDefault();
						onNavigate({ screen: "create" });
					}}
				>
					Create character
				</Button>
			</Group>

			{charactersQuery.isLoading && (
				<Paper withBorder p="lg">
					<Text c="dimmed">Loading characters...</Text>
				</Paper>
			)}

			{charactersQuery.error && (
				<Alert color="red" title="Characters unavailable" variant="light">
					Refresh the page to try again.
				</Alert>
			)}

			{charactersQuery.data && (
				<CharacterListContent
					characters={charactersQuery.data.characters}
					onNavigate={onNavigate}
				/>
			)}
		</Stack>
	);
}

function CharacterListContent({
	characters,
	onNavigate,
}: {
	characters: CharacterSummary[];
	onNavigate: NavigateToCharacterRoute;
}) {
	if (characters.length === 0) {
		return (
			<Paper withBorder p="lg">
				<Stack gap="sm" align="flex-start">
					<Title order={3} size="h4">
						No characters yet
					</Title>
					<Text c="dimmed" size="sm">
						Create your first character.
					</Text>
					<Button
						component="a"
						href={characterRoutePath({ screen: "create" })}
						onClick={(event) => {
							if (!shouldHandleCharacterLink(event)) return;
							event.preventDefault();
							onNavigate({ screen: "create" });
						}}
					>
						Create character
					</Button>
				</Stack>
			</Paper>
		);
	}

	return (
		<Stack component="ul" gap="sm" m={0} p={0}>
			{characters.map((character) => (
				<CharacterListItem key={character.id} character={character} onNavigate={onNavigate} />
			))}
		</Stack>
	);
}

function CharacterListItem({
	character,
	onNavigate,
}: {
	character: CharacterSummary;
	onNavigate: NavigateToCharacterRoute;
}) {
	const route = { screen: "detail", id: character.id } as const;

	return (
		<Paper component="li" withBorder p="md">
			<Group justify="space-between" align="center" wrap="wrap">
				<Stack gap={4}>
					<Anchor
						fw={700}
						href={characterRoutePath(route)}
						onClick={(event) => {
							if (!shouldHandleCharacterLink(event)) return;
							event.preventDefault();
							onNavigate(route);
						}}
					>
						{character.name}
					</Anchor>
					<Group gap="xs">
						<Badge variant="light">{character.className}</Badge>
						<Badge color="candle" variant="light">
							Level {character.level}
						</Badge>
					</Group>
				</Stack>
			</Group>
		</Paper>
	);
}
