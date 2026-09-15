import { Button, Group, Stack, Title } from "@mantine/core";
import { History } from "lucide-react";
import { type RefCallback, useState } from "react";
import { CharacterActivityDrawer } from "./character-activity-drawer.js";
import { CharacterInventory } from "./character-inventory.js";
import { CharacterTreasuryPanel } from "./character-treasury-panel.js";
import type { InventoryViewState } from "./inventory-filter-bar.js";
import "./inventory.css";

export function CharacterInventoryWorkspace({
	characterId,
	characterName,
	viewState,
	onViewStateChange,
	sectionHeadingRef,
}: {
	characterId: string;
	characterName: string;
	viewState?: InventoryViewState;
	onViewStateChange?: (state: InventoryViewState) => void;
	sectionHeadingRef?: RefCallback<HTMLHeadingElement>;
}) {
	const [historyOpened, setHistoryOpened] = useState(false);
	return (
		<Stack gap="md">
			<Group justify="space-between" wrap="wrap">
				<Title
					id="character-section-inventory-heading"
					order={2}
					ref={sectionHeadingRef}
					size="h4"
					tabIndex={-1}
				>
					Inventory
				</Title>
				<Button
					aria-label="View inventory activity"
					leftSection={<History size={16} aria-hidden="true" />}
					mih={44}
					onClick={() => setHistoryOpened(true)}
					variant="subtle"
				>
					History
				</Button>
			</Group>
			<CharacterTreasuryPanel characterId={characterId} />
			<CharacterInventory
				characterId={characterId}
				viewState={viewState}
				onViewStateChange={onViewStateChange}
			/>
			<CharacterActivityDrawer
				characterId={characterId}
				characterName={characterName}
				opened={historyOpened}
				onClose={() => setHistoryOpened(false)}
			/>
		</Stack>
	);
}
