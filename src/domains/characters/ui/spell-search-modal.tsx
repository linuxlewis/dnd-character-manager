import { Alert, Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import type { SearchCharacterSpellsResponse } from "../../../generated/api-client.generated.js";
import { formatSpellEntryDetail, formatSpellLevel } from "./spell-slot-format.js";

export type SpellSearchResult = SearchCharacterSpellsResponse["spells"][number];

export function SpellSearchModal({
	onChangeQuery,
	onClose,
	onRetrySearch = () => undefined,
	onSaveSpell,
	actionError,
	error = null,
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
	onRetrySearch?: () => void;
	onSaveSpell: (spell: SpellSearchResult) => void;
	actionError?: Error | null;
	error?: Error | null;
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
				{actionError && (
					<Alert color="red" title="Spell could not be saved" variant="light">
						{actionError.message} Choose the spell again to repeat the save.
					</Alert>
				)}
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
					) : error ? (
						<Alert color="red" title="Spell search unavailable" variant="light">
							{error.message}
							<Button mt="sm" onClick={onRetrySearch} size="sm" variant="light">
								Retry search
							</Button>
						</Alert>
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
