import {
	Alert,
	Button,
	Group,
	Paper,
	SimpleGrid,
	Stack,
	Text,
	UnstyledButton,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useState } from "react";
import { apiQueries } from "../../../generated/api-client.generated.js";
import type { DndSpellSearchResult } from "../types/index.js";
import classes from "./spell-search-result.module.css";
import { formatSpellEntryDetail } from "./spell-slot-format.js";

export function SpellSearchResult({
	characterId,
	spell,
	disabled,
	onAdd,
}: {
	characterId: string;
	spell: DndSpellSearchResult;
	disabled: boolean;
	onAdd: () => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const detailsId = useId();
	const query = useQuery({
		...apiQueries.getSpellSearchDetails(
			{ characterId },
			{ spellIndex: spell.index, source: spell.source },
		),
		enabled: expanded,
		retry: false,
		staleTime: 300_000,
	});
	return (
		<Paper withBorder p="sm">
			<Group gap="sm" wrap="nowrap" align="flex-start">
				<UnstyledButton
					className={classes.toggle}
					aria-expanded={expanded}
					aria-controls={detailsId}
					onClick={() => setExpanded(!expanded)}
				>
					<Group gap="xs" wrap="nowrap" justify="space-between">
						<Stack gap={2} className={classes.name}>
							<Text fw={600}>{spell.name}</Text>
							<Text size="sm" c="dimmed">
								{formatSpellEntryDetail(spell)}
							</Text>
							<Text size="xs" c="bloodstone.3">
								{expanded ? "Hide details" : "View details"}
							</Text>
						</Stack>
						{expanded ? (
							<ChevronUp size={18} aria-hidden="true" />
						) : (
							<ChevronDown size={18} aria-hidden="true" />
						)}
					</Group>
				</UnstyledButton>
				<Button
					variant="default"
					mih={44}
					disabled={disabled}
					onClick={onAdd}
					aria-label={`Add ${spell.name}`}
				>
					Add
				</Button>
			</Group>
			{expanded && (
				<Stack id={detailsId} gap="sm" mt="md" className={classes.details}>
					{query.isError ? (
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
					) : query.data ? (
						<>
							<SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
								{query.data.metadata.map((item) => (
									<div key={item.label}>
										<Text size="xs" c="dimmed">
											{item.label}
										</Text>
										<Text size="sm">{item.value}</Text>
									</div>
								))}
							</SimpleGrid>
							{query.data.desc.map((paragraph) => (
								<Text size="sm" key={paragraph}>
									{paragraph}
								</Text>
							))}
							{query.data.higherLevel.length > 0 && (
								<Text fw={600} size="sm">
									At higher levels
								</Text>
							)}
							{query.data.higherLevel.map((paragraph) => (
								<Text size="sm" key={paragraph}>
									{paragraph}
								</Text>
							))}
						</>
					) : (
						<Text role="status" size="sm" c="dimmed">
							Loading details...
						</Text>
					)}
				</Stack>
			)}
		</Paper>
	);
}
