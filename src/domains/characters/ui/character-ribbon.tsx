import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { CharacterDetail } from "../types/index.js";
import { CharacterEditor } from "./character-editor.js";
import { CharacterExperiencePanel } from "./character-experience-panel.js";
import { shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";

export function CharacterRibbon({
	character,
	onNavigate,
	renderApplicationMenu,
}: {
	character: CharacterDetail;
	onNavigate: NavigateToCharacterRoute;
	renderApplicationMenu?: (characterActions?: ReactNode) => ReactNode;
}) {
	return (
		<Stack gap="xs" className="character-ribbon">
			<Group wrap="nowrap" gap="xs">
				<Button
					component="a"
					href="/characters"
					aria-label="Back to characters"
					variant="subtle"
					className="character-back"
					onClick={(event) => {
						if (!shouldHandleCharacterLink(event)) return;
						event.preventDefault();
						onNavigate({ screen: "list" });
					}}
				>
					<ArrowLeft size={20} aria-hidden="true" />
				</Button>
				<Stack gap={0} className="character-identity">
					<Title order={1} size="h4">
						{character.name}
					</Title>
					<Text size="sm" c="dimmed">
						{character.className} · Level {character.level}
					</Text>
				</Stack>
				{renderApplicationMenu?.()}
			</Group>
			<CharacterEditor
				characterId={character.id}
				experiencePoints={character.experiencePoints}
				level={character.level}
				name={character.name}
			/>
			<CharacterExperiencePanel character={character} />
		</Stack>
	);
}
