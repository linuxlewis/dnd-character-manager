import { Alert, Button, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useCallback } from "react";
import { apiQueries } from "../../../generated/api-client.generated.js";
import type { DndSpellSearchResult } from "../types/index.js";
import { SpellDetailsContent } from "./spell-details-content.js";

export function SpellSearchDetails({
	characterId,
	spell,
	onBack,
}: {
	characterId: string;
	spell: DndSpellSearchResult;
	onBack: () => void;
}) {
	const focusBack = useCallback((node: HTMLButtonElement | null) => {
		node?.focus();
	}, []);
	const query = useQuery({
		...apiQueries.getSpellSearchDetails(
			{ characterId },
			{ spellIndex: spell.index, source: spell.source },
		),
		retry: false,
		retryOnMount: false,
		refetchOnWindowFocus: false,
		staleTime: 300_000,
	});
	return (
		<Stack gap="md">
			<Button
				ref={focusBack}
				onClick={onBack}
				variant="default"
				mih={44}
				leftSection={<ArrowLeft size={18} aria-hidden="true" />}
			>
				Back to search
			</Button>
			{query.data ? (
				<SpellDetailsContent details={query.data} />
			) : query.isError ? (
				<Alert color="red" title="Spell details unavailable">
					<Button
						variant="subtle"
						mih={44}
						onClick={() => query.refetch()}
						loading={query.isFetching}
					>
						Retry details
					</Button>
				</Alert>
			) : (
				<Text role="status" size="sm" c="dimmed">
					Loading details...
				</Text>
			)}
		</Stack>
	);
}
