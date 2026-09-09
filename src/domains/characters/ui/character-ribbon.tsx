import { Button, Group, Modal, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import type { CharacterExperienceProgress, CharacterSummary } from "../types/index.js";
import { CharacterEditor } from "./character-editor.js";
import { CharacterExperiencePanel } from "./character-experience-panel.js";
import classes from "./character-ribbon.module.css";
import type { NavigateToCharacterRoute } from "./character-route.js";
import { shouldHandleCharacterLink } from "./character-route.js";

export function CharacterRibbon({
	character,
	onNavigate,
	renderApplicationMenu,
}: {
	character: CharacterSummary & {
		experiencePoints: number;
		experience: CharacterExperienceProgress;
	};
	onNavigate: NavigateToCharacterRoute;
	renderApplicationMenu?: () => ReactNode;
}) {
	const identityRef = useRef<HTMLButtonElement>(null);
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
						ref={identityRef}
						className={classes.identity}
						aria-label={`Character details for ${character.name}`}
						onClick={() => setDetailsOpened(true)}
					>
						<Group wrap="nowrap" gap={4}>
							<Title order={1} fz={20} lh={1.2} className={classes.name}>
								{character.name}
							</Title>
							<ChevronDown size={16} className={classes.chevron} aria-hidden="true" />
						</Group>
						<Text size="xs">
							{character.className} · Level {character.level}
						</Text>
					</UnstyledButton>
					{renderApplicationMenu?.()}
				</Group>
				<CharacterExperiencePanel character={character} compact />
			</Stack>
			{detailsOpened && (
				<Modal
					classNames={{ body: "workspace-inputs" }}
					opened={detailsOpened}
					returnFocus={false}
					onClose={() => {
						setDetailsOpened(false);
						identityRef.current?.focus({ preventScroll: true });
					}}
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
							data-autofocus
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
			)}
			{editorOpened && (
				<CharacterEditor
					opened
					onClose={() => {
						setEditorOpened(false);
						setDetailsOpened(true);
					}}
					characterId={character.id}
					experiencePoints={character.experiencePoints}
					level={character.level}
					name={character.name}
				/>
			)}
		</>
	);
}
