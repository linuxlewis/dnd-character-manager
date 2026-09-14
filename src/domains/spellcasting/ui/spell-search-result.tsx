import { ActionIcon, Paper, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
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
				<Stack gap={4} w="100%">
					<Stack gap={0} className={classes.heading}>
						<Text fw={600} lineClamp={1}>
							{spell.name}
						</Text>
						<Text size="sm" c="dimmed">
							{formatSpellEntryDetail(spell)}
						</Text>
					</Stack>
					<Text size="sm" lineClamp={2}>
						{query.data?.desc[0] ?? (query.isError ? "Preview unavailable." : "Loading preview...")}
					</Text>
				</Stack>
			</UnstyledButton>
			<Tooltip label="View spell details" events={{ hover: true, focus: true, touch: false }}>
				<ActionIcon
					className={classes.seeMore}
					variant="transparent"
					color="bloodstone.3"
					size={44}
					disabled={disabled}
					onClick={onSeeMore}
					aria-label={`View details for ${spell.name}`}
				>
					<Info size={20} aria-hidden="true" />
				</ActionIcon>
			</Tooltip>
		</Paper>
	);
}
