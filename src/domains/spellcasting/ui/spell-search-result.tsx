import { Button, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { apiQueries } from "../../../generated/api-client.generated.js";
import type { DndSpellSearchResult } from "../types/index.js";
import classes from "./spell-search-result.module.css";
import { formatSpellEntryDetail } from "./spell-slot-format.js";

export function SpellSearchResult({
	characterId,
	spell,
	disabled,
	onAdd,
	onSeeMore,
}: {
	characterId: string;
	spell: DndSpellSearchResult;
	disabled: boolean;
	onAdd: () => void;
	onSeeMore: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
	const { ref, entry } = useIntersection<HTMLDivElement>();
	const query = useQuery({
		...apiQueries.getSpellSearchDetails(
			{ characterId },
			{ spellIndex: spell.index, source: spell.source },
		),
		enabled: Boolean(entry?.isIntersecting) && !disabled,
		retry: false,
		refetchOnWindowFocus: false,
		staleTime: 300_000,
	});
	return (
		<Paper ref={ref} withBorder className={classes.result}>
			<UnstyledButton
				className={classes.addTarget}
				disabled={disabled}
				onClick={onAdd}
				aria-label={`Add ${spell.name}`}
			>
				<Stack gap={4}>
					<Text fw={600} lineClamp={1}>
						{spell.name}
					</Text>
					<Text size="sm" c="dimmed">
						{formatSpellEntryDetail(spell)}
					</Text>
					<Text size="sm" lineClamp={2}>
						{query.data?.desc[0] ?? (query.isError ? "Preview unavailable." : "Loading preview...")}
					</Text>
				</Stack>
			</UnstyledButton>
			<Button
				className={classes.seeMore}
				variant="transparent"
				color="bloodstone.3"
				mih={44}
				disabled={disabled}
				onClick={onSeeMore}
				aria-label={`See more about ${spell.name}`}
			>
				See more
			</Button>
		</Paper>
	);
}
