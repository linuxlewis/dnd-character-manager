import { Alert, Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import type { SearchCharacterSpellsResponse } from "../../../generated/api-client.generated.js";
import { formatSpellEntryDetail, formatSpellLevel } from "./spell-slot-format.js";

export type SpellSearchResult = SearchCharacterSpellsResponse["spells"][number];

export function SpellSearchModal({
	onChangeQuery,
	onClose,
	onSaveSpell,
	opened,
	pending,
	saving = false,
	query,
	results,
	searched,
	slotLevel,
	error,
	withinPortal = true,
}: {
	onChangeQuery: (query: string) => void;
	onClose: () => void;
	onSaveSpell: (spell: SpellSearchResult) => void;
	opened: boolean;
	pending: boolean;
	saving?: boolean;
	query: string;
	results: SpellSearchResult[];
	searched: boolean;
	slotLevel: number;
	error?: Error | null;
	withinPortal?: boolean;
}) {
	const mobile = useMediaQuery("(max-width: 47.999em)");
	return (
		<Modal
			closeButtonProps={{ "aria-label": "Close add spell dialog", size: "xl", disabled: saving }}
			fullScreen={mobile}
			size="lg"
			onClose={() => {
				if (!saving) onClose();
			}}
			opened={opened}
			title={
				slotLevel === 0 ? "Add cantrip or feature" : `Add spell to ${formatSpellLevel(slotLevel)}`
			}
			transitionProps={{ duration: 0 }}
			withinPortal={withinPortal}
		>
			<Stack gap="md" className="workspace-inputs">
				{error && (
					<Alert color="red" title="Spell search or save failed">
						Your search is still here. Retry the selection or change the search to try again.
					</Alert>
				)}
				<TextInput
					data-autofocus
					disabled={saving}
					label={slotLevel === 0 ? "Search cantrips and features" : "Search spells"}
					onChange={(event) => onChangeQuery(event.currentTarget.value)}
					placeholder={slotLevel === 0 ? "Name" : "Spell name"}
					size="md"
					value={query}
				/>

				<Stack gap="xs">
					{pending ? (
						<Text c="dimmed" size="sm">
							{saving ? "Adding spell..." : "Searching..."}
						</Text>
					) : searched && results.length === 0 ? (
						<Text c="dimmed" size="sm">
							No spells found.
						</Text>
					) : (
						results.map((spell) => (
							<Button
								mih={44}
								h="auto"
								py="sm"
								key={spell.index}
								color="gray"
								disabled={pending}
								onClick={() => onSaveSpell(spell)}
								styles={{ label: { whiteSpace: "normal" } }}
								variant="default"
							>
								<Group justify="space-between" wrap="wrap" w="100%">
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
