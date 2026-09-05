import { Alert, Anchor, Paper, Stack, Text, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { ApiClientError, apiQueries } from "../../../generated/api-client.generated.js";
import {
	CharacterActivity,
	CharacterInventory,
	CharacterTreasuryPanel,
} from "../../inventory/ui/index.js";
import { CharacterAttributesPanel } from "./character-attributes-panel.js";
import { CharacterRibbon } from "./character-ribbon.js";
import {
	type CharacterSection,
	characterRoutePath,
	shouldHandleCharacterLink,
} from "./character-route.js";
import { CharacterSectionNavigation } from "./character-section-navigation.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";
import { CharacterSpellSlotsPanel } from "./spell-slot-panel.js";

interface CharacterDetailProps {
	id: string;
	onNavigate: NavigateToCharacterRoute;
	section?: CharacterSection;
}

export function CharacterDetail({ id, onNavigate, section = "attributes" }: CharacterDetailProps) {
	const lastFocusedSection = useRef<CharacterSection>(section);
	const characterQuery = useQuery(apiQueries.getCharacter({ characterId: id }));

	function focusActiveSectionHeading(node: HTMLHeadingElement | null) {
		if (!node || lastFocusedSection.current === section) return;
		lastFocusedSection.current = section;
		node.focus({ preventScroll: true });
	}

	if (characterQuery.isLoading) {
		return <LoadingCharacter />;
	}
	if (isNotFound(characterQuery.error)) {
		return <NotFoundCharacter onNavigate={onNavigate} />;
	}
	if (characterQuery.error || !characterQuery.data) {
		return <UnavailableCharacter />;
	}

	const character = characterQuery.data.character;
	return (
		<Paper withBorder p={{ base: "md", sm: "lg" }}>
			<Stack gap={0}>
				<CharacterRibbon character={character} onNavigate={onNavigate} />
				<CharacterSectionNavigation
					characterId={id}
					activeSection={section}
					onNavigate={onNavigate}
				/>
				<section
					aria-labelledby={`character-section-${section}-heading`}
					id={`character-section-${section}`}
				>
					{section === "attributes" && (
						<CharacterAttributesPanel
							characterId={id}
							characterLevel={character.level}
							sectionHeadingRef={focusActiveSectionHeading}
						/>
					)}
					{section === "spells" && (
						<CharacterSpellSlotsPanel
							characterId={id}
							level={character.level}
							sectionHeadingRef={focusActiveSectionHeading}
						/>
					)}
					{section === "inventory" && (
						<Stack gap="md">
							<Title
								id="character-section-inventory-heading"
								order={3}
								ref={focusActiveSectionHeading}
								tabIndex={-1}
								size="h4"
							>
								Inventory
							</Title>
							<CharacterTreasuryPanel characterId={id} embedded />
							<CharacterActivity characterId={id} characterName={character.name} />
							<CharacterInventory characterId={id} embedded />
						</Stack>
					)}
				</section>
			</Stack>
		</Paper>
	);
}

function LoadingCharacter() {
	return (
		<Paper withBorder p="lg">
			<Text c="dimmed">Loading character...</Text>
		</Paper>
	);
}

function NotFoundCharacter({ onNavigate }: { onNavigate: NavigateToCharacterRoute }) {
	return (
		<Alert color="yellow" title="Character not found" variant="light">
			<Text size="sm">This character is not available in the current session.</Text>
			<Anchor
				display="block"
				href={characterRoutePath({ screen: "list" })}
				onClick={(event) => {
					if (!shouldHandleCharacterLink(event)) return;
					event.preventDefault();
					onNavigate({ screen: "list" });
				}}
				mt="sm"
			>
				Back to characters
			</Anchor>
		</Alert>
	);
}

function UnavailableCharacter() {
	return (
		<Alert color="red" title="Character unavailable" variant="light">
			Refresh the page to try again.
		</Alert>
	);
}

function isNotFound(error: Error | null) {
	return error instanceof ApiClientError && error.status === 404;
}
