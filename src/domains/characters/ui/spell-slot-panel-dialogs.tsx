import type { CharacterSpellsResponse } from "../../../generated/api-client.generated.js";
import type { CharacterSpellDetails } from "../types/index.js";
import { SpellDetailsModal } from "./spell-details-modal.js";
import { SpellRemoveModal } from "./spell-remove-modal.js";
import { SpellSearchModal, type SpellSearchResult } from "./spell-search-modal.js";

export interface SpellSearchPanelState {
	query: string;
	slotLevel: number;
}

export function SpellSlotPanelDialogs({
	actionError,
	details,
	detailsOpened,
	detailsError,
	detailsPending,
	onChangeQuery,
	onCloseDetails,
	onCloseRemove,
	onCloseSearch,
	onRemove,
	onRetryDetails,
	onRetrySearch,
	onSave,
	removeError,
	removePending,
	searchError,
	searchPending,
	searchResults,
	searchState,
	searched,
	spellToRemove,
	withinPortal = true,
}: {
	actionError: Error | null;
	details: CharacterSpellDetails | null;
	detailsOpened: boolean;
	detailsError: Error | null;
	detailsPending: boolean;
	onChangeQuery: (query: string) => void;
	onCloseDetails: () => void;
	onCloseRemove: () => void;
	onCloseSearch: () => void;
	onRemove: () => void;
	onRetryDetails: () => void;
	onRetrySearch: () => void;
	onSave: (spell: SpellSearchResult) => void;
	removeError: Error | null;
	removePending: boolean;
	searchError: Error | null;
	searchPending: boolean;
	searchResults: SpellSearchResult[];
	searchState: SpellSearchPanelState | null;
	searched: boolean;
	spellToRemove: CharacterSpellsResponse["spells"][number] | null;
	withinPortal?: boolean;
}) {
	return (
		<>
			<SpellSearchModal
				actionError={actionError}
				onChangeQuery={onChangeQuery}
				onClose={onCloseSearch}
				onRetrySearch={onRetrySearch}
				onSaveSpell={onSave}
				error={searchError}
				opened={searchState !== null}
				pending={searchPending}
				query={searchState?.query ?? ""}
				results={searchResults}
				searched={searched}
				slotLevel={searchState?.slotLevel ?? 1}
				withinPortal={withinPortal}
			/>
			<SpellDetailsModal
				details={details}
				error={detailsError}
				onClose={onCloseDetails}
				onRetry={onRetryDetails}
				opened={detailsOpened}
				pending={detailsPending}
				withinPortal={withinPortal}
			/>
			<SpellRemoveModal
				error={removeError}
				onClose={onCloseRemove}
				onConfirm={onRemove}
				pending={removePending}
				spell={spellToRemove}
				withinPortal={withinPortal}
			/>
		</>
	);
}
