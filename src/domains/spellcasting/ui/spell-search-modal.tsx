import { Alert, Button, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue, useMediaQuery } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient, apiMutations, apiQueryKeys } from "../../../generated/api-client.generated.js";
import { SpellSearchResult } from "./spell-search-result.js";
import { formatSpellLevel } from "./spell-slot-format.js";

export function SpellSearchModal({
	characterId,
	slotLevel,
	onClose,
	withinPortal = true,
}: {
	characterId: string;
	slotLevel: number;
	onClose: () => void;
	withinPortal?: boolean;
}) {
	const mobile = useMediaQuery("(max-width: 47.999em)");
	const [query, setQuery] = useState("");
	const input = query.trim();
	const [debounced] = useDebouncedValue(input, 300);
	const queryText = input === debounced ? debounced : "";
	const search = useQuery({
		queryKey: ["characterSpellSearch", characterId, slotLevel, queryText],
		queryFn: () =>
			apiClient.searchCharacterSpells({ characterId }, { slotLevel, query: queryText }),
		enabled: queryText.length > 0,
		retry: false,
	});
	const queryClient = useQueryClient();
	const save = useMutation({
		...apiMutations.saveCharacterSpell(),
		onSuccess: (response, variables) => {
			queryClient.setQueryData(
				apiQueryKeys.listCharacterSpells({ characterId: variables.params.characterId }),
				response,
			);
			onClose();
		},
	});
	const pending = search.isFetching || save.isPending;
	const results = queryText ? (search.data?.spells ?? []) : [];
	return (
		<Modal
			closeButtonProps={{
				"aria-label": "Close add spell dialog",
				size: "xl",
				disabled: save.isPending,
			}}
			fullScreen={mobile}
			size="lg"
			onClose={() => {
				if (!save.isPending) onClose();
			}}
			opened
			closeOnEscape={!save.isPending}
			closeOnClickOutside={!save.isPending}
			title={
				slotLevel === 0 ? "Add cantrip or feature" : `Add spell to ${formatSpellLevel(slotLevel)}`
			}
			transitionProps={{ duration: 0 }}
			withinPortal={withinPortal}
		>
			<Stack gap="md" className="workspace-inputs">
				<TextInput
					data-autofocus
					disabled={save.isPending}
					label={slotLevel === 0 ? "Search cantrips and features" : "Search spells"}
					onChange={(event) => setQuery(event.currentTarget.value)}
					placeholder={slotLevel === 0 ? "Name" : "Spell name"}
					size="md"
					value={query}
				/>
				{search.error && queryText && (
					<Alert color="red" title="Spell search unavailable" variant="light">
						<Button
							mih={44}
							onClick={() => search.refetch()}
							loading={search.isFetching}
							variant="subtle"
						>
							Retry search
						</Button>
					</Alert>
				)}
				{save.error && (
					<Alert color="red" title="Spell could not be saved" variant="light">
						<Button
							onClick={() => {
								if (save.variables) save.mutate(save.variables);
							}}
							mih={44}
							loading={save.isPending}
							variant="subtle"
						>
							Retry saving spell
						</Button>
					</Alert>
				)}
				<Stack gap="xs">
					{pending ? (
						<Text c="dimmed" size="sm">
							{save.isPending ? "Adding spell..." : "Searching..."}
						</Text>
					) : queryText && !search.error && results.length === 0 ? (
						<Text c="dimmed" size="sm">
							No spells found.
						</Text>
					) : (
						results.map((spell) => (
							<SpellSearchResult
								key={`${spell.source}:${spell.index}`}
								characterId={characterId}
								spell={spell}
								disabled={pending}
								onAdd={() =>
									save.mutate({
										params: { characterId },
										body: { slotLevel, spellIndex: spell.index, source: spell.source },
									})
								}
							/>
						))
					)}
				</Stack>
			</Stack>
		</Modal>
	);
}
