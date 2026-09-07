import { Alert, Button, Group, Paper, Stack, Text, VisuallyHidden } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ApiClientError, apiQueries } from "../../../generated/api-client.generated.js";
import {
	CharacterActivity,
	CharacterInventory,
	CharacterTreasuryPanel,
	type InventoryViewState,
} from "../../inventory/ui/index.js";
import { CharacterRibbon } from "./character-ribbon.js";
import {
	type CharacterSection,
	characterRoutePath,
	shouldHandleCharacterLink,
} from "./character-route.js";
import { CharacterSectionNavigation } from "./character-section-navigation.js";
import type { NavigateToCharacterRoute } from "./character-workspace.js";
import { CharacterHealthPanel } from "./health-panel.js";
import { CharacterSpellSlotsPanel } from "./spell-slot-panel.js";

interface CharacterDetailProps {
	id: string;
	onNavigate: NavigateToCharacterRoute;
	section?: CharacterSection;
	renderApplicationMenu?: (characterActions?: ReactNode) => ReactNode;
	inventoryView?: InventoryViewState;
	onInventoryViewChange?: (state: InventoryViewState) => void;
}

export function CharacterDetail({
	id,
	onNavigate,
	section = "spells",
	renderApplicationMenu,
	inventoryView,
	onInventoryViewChange,
}: CharacterDetailProps) {
	const characterQuery = useQuery(apiQueries.getCharacter({ characterId: id }));

	return (
		<Stack gap="md" className="character-workspace">
			<VisuallyHidden role="status" aria-live="polite">
				{section === "spells" ? "Spells & Abilities section" : "Inventory section"}
			</VisuallyHidden>
			{(!characterQuery.data || characterQuery.error) && (
				<Group justify="space-between" align="center">
					<BackToListButton onNavigate={onNavigate} />
					{renderApplicationMenu?.()}
				</Group>
			)}

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
				<>
					<section className="character-sticky-header" aria-label="Character workspace header">
						<CharacterRibbon
							character={characterQuery.data.character}
							onNavigate={onNavigate}
							renderApplicationMenu={renderApplicationMenu}
						/>
						<CharacterHealthPanel
							characterId={id}
							health={characterQuery.data.character.health}
							recentHealthChanges={characterQuery.data.character.recentHealthChanges}
						/>
					</section>
					<CharacterSectionNavigation characterId={id} section={section} onNavigate={onNavigate} />
					<section
						className="character-section-content"
						aria-label={section === "spells" ? "Spells & Abilities" : "Inventory"}
					>
						{section === "spells" ? (
							<CharacterSpellSlotsPanel
								characterId={id}
								level={characterQuery.data.character.level}
							/>
						) : (
							<Stack gap="md">
								<CharacterTreasuryPanel characterId={id} />
								<CharacterActivity
									characterId={id}
									characterName={characterQuery.data.character.name}
								/>
								<CharacterInventory
									characterId={id}
									viewState={inventoryView}
									onViewStateChange={onInventoryViewChange}
								/>
							</Stack>
						)}
					</section>
				</>
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
