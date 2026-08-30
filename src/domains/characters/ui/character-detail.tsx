import { Alert, Badge, Button, Group, Paper, Stack, Tabs, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ApiClientError, apiQueries } from "../../../generated/api-client.generated.js";
import { CharacterInventory, CharacterTreasuryPanel } from "../../inventory/ui/index.js";
import { CharacterEditor } from "./character-editor.js";
import { CharacterExperiencePanel } from "./character-experience-panel.js";
import { characterRoutePath, shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";
import { CharacterHealthPanel } from "./health-panel.js";
import { CharacterSpellSlotsPanel } from "./spell-slot-panel.js";

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

			{characterQuery.data && !characterQuery.error && (
				<Paper withBorder p="lg">
					<Stack gap="md">
						<Group gap="xs" align="center">
							<Title order={3}>{characterQuery.data.character.name}</Title>
							<CharacterEditor
								characterId={characterQuery.data.character.id}
								experiencePoints={characterQuery.data.character.experiencePoints}
								level={characterQuery.data.character.level}
								name={characterQuery.data.character.name}
							/>
						</Group>
						<Group gap="xs">
							<Badge variant="light">{characterQuery.data.character.className}</Badge>
							<Badge color="candle" variant="light">
								Level {characterQuery.data.character.level}
							</Badge>
						</Group>
						<Tabs defaultValue="spells-abilities" keepMounted={false}>
							<Tabs.List aria-label="Character sections">
								<Tabs.Tab value="spells-abilities">Spells &amp; Abilities</Tabs.Tab>
								<Tabs.Tab value="inventory">Inventory</Tabs.Tab>
							</Tabs.List>

							<Tabs.Panel value="spells-abilities" pt="md">
								<Stack gap="md">
									<CharacterExperiencePanel character={characterQuery.data.character} />
									<CharacterHealthPanel
										characterId={characterQuery.data.character.id}
										health={characterQuery.data.character.health}
										recentHealthChanges={characterQuery.data.character.recentHealthChanges}
									/>
									<CharacterSpellSlotsPanel
										characterId={characterQuery.data.character.id}
										level={characterQuery.data.character.level}
									/>
								</Stack>
							</Tabs.Panel>

							<Tabs.Panel value="inventory" pt="md">
								<Stack gap="md">
									<CharacterTreasuryPanel characterId={characterQuery.data.character.id} />
									<CharacterInventory characterId={characterQuery.data.character.id} />
								</Stack>
							</Tabs.Panel>
						</Tabs>
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
