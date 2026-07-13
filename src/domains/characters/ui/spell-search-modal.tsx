import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import type { SearchCharacterSpellsResponse } from "../../../generated/api-client.generated.js";
import { formatSpellEntryDetail, formatSpellLevel } from "./spell-slot-format.js";

export type SpellSearchResult = SearchCharacterSpellsResponse["spells"][number];

export function SpellSearchModal({
	onChangeQuery,
	onClose,
	onSaveSpell,
	opened,
	pending,
	query,
	results,
	searched,
	slotLevel,
	withinPortal = true,
}: {
	onChangeQuery: (query: string) => void;
	onClose: () => void;
	onSaveSpell: (spell: SpellSearchResult) => void;
	opened: boolean;
	pending: boolean;
	query: string;
	results: SpellSearchResult[];
	searched: boolean;
	slotLevel: number;
	withinPortal?: boolean;
}) {
	return (
		<Modal
			closeButtonProps={{ "aria-label": "Close add spell dialog", size: "xl" }}
			fullScreen
			onClose={onClose}
			opened={opened}
			title={
				slotLevel === 0 ? "Add cantrip or feature" : `Add spell to ${formatSpellLevel(slotLevel)}`
			}
			transitionProps={{ duration: 0 }}
			withinPortal={withinPortal}
		>
			<Stack gap="md">
				<TextInput
					data-autofocus
					label={slotLevel === 0 ? "Search cantrips and features" : "Search spells"}
					onChange={(event) => onChangeQuery(event.currentTarget.value)}
					placeholder={slotLevel === 0 ? "Name" : "Spell name"}
					size="md"
					value={query}
				/>

				<Stack gap="xs">
					{pending ? (
						<Text c="dimmed" size="sm">
							Searching...
						</Text>
					) : searched && results.length === 0 ? (
						<Text c="dimmed" size="sm">
							No spells found.
						</Text>
					) : (
						results.map((spell) => (
							<Button
								key={spell.index}
								color="gray"
								disabled={pending}
								onClick={() => onSaveSpell(spell)}
								variant="default"
							>
								<Group justify="space-between" wrap="nowrap" w="100%">
									<span>{spell.name}</span>
									<span>{formatSearchResultDetail(spell)}</span>
								</Group>
							</Button>
						))
					)}
				</Stack>
			</Stack>
		</Modal>
	);
}

function formatSearchResultDetail(spell: SpellSearchResult) {
	return formatSpellEntryDetail(spell);
}
