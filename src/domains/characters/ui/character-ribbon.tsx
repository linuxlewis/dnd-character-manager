import { Button, Group, Menu, Modal, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { CharacterDetail } from "../types/index.js";
import { CharacterEditor } from "./character-editor.js";
import { CharacterExperiencePanel } from "./character-experience-panel.js";
import classes from "./character-ribbon.module.css";
import { shouldHandleCharacterLink } from "./character-route.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";

export function CharacterRibbon({
	character,
	onNavigate,
	renderApplicationMenu,
	onOpenHealthHistory,
}: {
	character: CharacterDetail;
	onNavigate: NavigateToCharacterRoute;
	renderApplicationMenu?: (characterActions?: ReactNode) => ReactNode;
	onOpenHealthHistory?: () => void;
}) {
	const [detailsOpened, setDetailsOpened] = useState(false);
	const [editorOpened, setEditorOpened] = useState(false);
	return (
		<>
			<Stack gap={2} className="character-ribbon">
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
					<UnstyledButton
						className={classes.identity}
						aria-label={`Character details for ${character.name}`}
						onClick={() => setDetailsOpened(true)}
					>
						<Title order={1} fz={20} lh={1.2} className={classes.name}>
							{character.name}
						</Title>
						<Text size="xs">
							{character.className} · Level {character.level}
						</Text>
					</UnstyledButton>
					{renderApplicationMenu?.(
						<>
							<Menu.Item mih={44} onClick={() => setEditorOpened(true)}>
								Edit character
							</Menu.Item>
							<Menu.Item mih={44} onClick={onOpenHealthHistory}>
								Health history
							</Menu.Item>
						</>,
					)}
				</Group>
				<CharacterExperiencePanel character={character} compact />
			</Stack>
			<Modal
				opened={detailsOpened}
				onClose={() => setDetailsOpened(false)}
				title="Character details"
				closeButtonProps={{ "aria-label": "Close", size: 44 }}
			>
				<Stack>
					<Title order={2} style={{ overflowWrap: "anywhere" }}>
						{character.name}
					</Title>
					<Text>
						{character.className} · Level {character.level}
					</Text>
					<CharacterExperiencePanel character={character} />
					<Button
						className="workspace-primary-action"
						c="black"
						mih={44}
						onClick={() => {
							setDetailsOpened(false);
							setEditorOpened(true);
						}}
					>
						Edit character
					</Button>
				</Stack>
			</Modal>
			{editorOpened && (
				<CharacterEditor
					opened
					onClose={() => setEditorOpened(false)}
					characterId={character.id}
					experiencePoints={character.experiencePoints}
					level={character.level}
					name={character.name}
				/>
			)}
		</>
	);
}
