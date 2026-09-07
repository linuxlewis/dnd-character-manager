import { Button, Group, Stack, Title } from "@mantine/core";
import { History } from "lucide-react";
import { useState } from "react";
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
}: {
	characterId: string;
	characterName: string;
	viewState?: InventoryViewState;
	onViewStateChange?: (state: InventoryViewState) => void;
}) {
	const [historyOpened, setHistoryOpened] = useState(false);
	return (
		<Stack gap="md">
			<Group justify="space-between" wrap="nowrap">
				<Title order={2} size="h4">
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
