import { Anchor, Badge, Box, Divider, Group, SimpleGrid, Stack, Title } from "@mantine/core";
import type { CharacterDetailResponse } from "../../../generated/api-client.generated.js";
import { CharacterEditor } from "./character-editor.js";
import { CharacterExperiencePanel } from "./character-experience-panel.js";
import { characterRoutePath, shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";
import { CharacterHealthPanel } from "./health-panel.js";

type Character = CharacterDetailResponse["character"];

export function CharacterRibbon({
	character,
	onNavigate,
}: {
	character: Character;
	onNavigate: NavigateToCharacterRoute;
}) {
	return (
		<Stack gap="md" pb="lg">
			<BackToListLink onNavigate={onNavigate} />
			<Group align="flex-start" justify="space-between" gap="sm" wrap="wrap">
				<Stack gap="xs">
					<Title id="character-name" order={2} size="h3">
						{character.name}
					</Title>
					<Group gap="xs">
						<Badge variant="light">{character.className}</Badge>
						<Badge color="candle" variant="light">
							Level {character.level}
						</Badge>
					</Group>
				</Stack>
				<CharacterEditor
					characterId={character.id}
					experiencePoints={character.experiencePoints}
					level={character.level}
					name={character.name}
				/>
			</Group>
			<Divider />
			<SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: "lg", md: "xl" }}>
				<Box>
					<CharacterExperiencePanel character={character} />
				</Box>
				<Box>
					<CharacterHealthPanel
						characterId={character.id}
						health={character.health}
						recentHealthChanges={character.recentHealthChanges}
					/>
				</Box>
			</SimpleGrid>
		</Stack>
	);
}

function BackToListLink({ onNavigate }: { onNavigate: NavigateToCharacterRoute }) {
	return (
		<Anchor
			href={characterRoutePath({ screen: "list" })}
			onClick={(event) => {
				if (!shouldHandleCharacterLink(event)) return;
				event.preventDefault();
				onNavigate({ screen: "list" });
			}}
		>
			Back to characters
		</Anchor>
	);
}
