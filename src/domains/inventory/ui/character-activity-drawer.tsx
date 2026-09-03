import {
	Alert,
	Box,
	Button,
	Drawer,
	ScrollArea,
	SegmentedControl,
	Stack,
	Text,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiQueries } from "../../../generated/api-client.generated.js";
import type { CharacterHistoryEntry } from "../types/index.js";
import { ActivityEntry, ActivitySkeleton } from "./activity-entry.js";
import {
	type ActivityFilter,
	appendActivityPage,
	formatHistoryQuery,
	getActivityFilterLabel,
	groupActivityEntries,
} from "./activity-format.js";
import "./activity.css";

const PAGE_SIZE = 20;

type ActivityPaginationState = {
	characterId: string;
	entries: CharacterHistoryEntry[];
	filter: ActivityFilter;
	offset: number;
};

const FILTER_OPTIONS = [
	{ label: "All", value: "all" },
	{ label: "Items", value: "items" },
	{ label: "Treasury", value: "treasury" },
];

export function CharacterActivityDrawer({
	characterId,
	characterName,
	opened,
	onClose,
	withinPortal = true,
}: {
	characterId: string;
	characterName: string;
	opened: boolean;
	onClose: () => void;
	withinPortal?: boolean;
}) {
	const [pagination, setPagination] = useState<ActivityPaginationState>({
		characterId,
		entries: [],
		filter: "all",
		offset: 0,
	});
	const sameCharacter = pagination.characterId === characterId;
	const filter = sameCharacter ? pagination.filter : "all";
	const offset = sameCharacter ? pagination.offset : 0;
	const loadedEntries = sameCharacter ? pagination.entries : [];
	const query = useQuery({
		...apiQueries.listCharacterHistory(
			{ characterId },
			formatHistoryQuery(filter, offset, PAGE_SIZE),
		),
		enabled: opened,
		retry: false,
		staleTime: 30_000,
	});
	const pageEntries = query.data?.entries ?? [];
	const entries = appendActivityPage(loadedEntries, pageEntries);

	function changeFilter(nextFilter: string) {
		if (nextFilter !== "all" && nextFilter !== "items" && nextFilter !== "treasury") return;
		setPagination({ characterId, entries: [], filter: nextFilter, offset: 0 });
	}

	function loadMore() {
		if (!query.data?.hasMore) return;
		setPagination({
			characterId,
			entries,
			filter,
			offset: query.data.offset + query.data.limit,
		});
	}

	return (
		<Drawer
			aria-label="Inventory activity"
			closeButtonProps={{ "aria-label": "Close inventory activity", size: "lg" }}
			onClose={onClose}
			opened={opened}
			position="right"
			size={480}
			styles={{
				body: { paddingBottom: "calc(var(--mantine-spacing-lg) + env(safe-area-inset-bottom))" },
				content: { maxWidth: "100vw" },
			}}
			title="Inventory activity"
			withinPortal={withinPortal}
		>
			<Stack gap="md" style={{ minHeight: "100%" }}>
				<Text c="dimmed" size="sm">
					{characterName}
				</Text>
				<SegmentedControl
					aria-label="Activity filter"
					className="character-activity-filter"
					data={FILTER_OPTIONS}
					fullWidth
					onChange={changeFilter}
					styles={{
						label: { alignItems: "center", display: "flex", minHeight: 44 },
						root: { minHeight: 44 },
					}}
					value={filter}
				/>

				<ScrollArea offsetScrollbars style={{ flex: 1 }}>
					{offset === 0 && query.isLoading && <ActivitySkeleton count={4} />}
					{offset === 0 && query.error && (
						<ActivityInitialError onRetry={() => void query.refetch()} />
					)}
					{!query.isLoading && !query.error && entries.length === 0 && (
						<ActivityEmpty filter={filter} onShowAll={() => changeFilter("all")} />
					)}
					{entries.length > 0 && <ActivityGroups entries={entries} />}
					{offset > 0 && query.isFetching && <ActivitySkeleton count={2} />}
					{offset > 0 && query.error && entries.length > 0 && (
						<ActivityPaginationError onRetry={() => void query.refetch()} />
					)}
					{!query.error && query.data?.hasMore && !query.isFetching && (
						<Button fullWidth mt="md" onClick={loadMore} style={{ minHeight: 44 }} variant="light">
							Load more activity
						</Button>
					)}
				</ScrollArea>
			</Stack>
		</Drawer>
	);
}

function ActivityGroups({ entries }: { entries: CharacterHistoryEntry[] }) {
	return (
		<Stack gap="lg">
			{groupActivityEntries(entries).map((group) => (
				<Box component="section" key={group.key}>
					<Text component="h3" c="dimmed" fw={700} mb="sm" size="xs" tt="uppercase">
						{group.label}
					</Text>
					<Box style={{ position: "relative" }}>
						<Box
							aria-hidden="true"
							style={{
								backgroundColor: "var(--mantine-color-dark-4)",
								bottom: 16,
								left: 15,
								position: "absolute",
								top: 16,
								width: 1,
							}}
						/>
						<Stack gap="lg">
							{group.entries.map((entry) => (
								<ActivityEntry entry={entry} key={entry.id} />
							))}
						</Stack>
					</Box>
				</Box>
			))}
		</Stack>
	);
}

function ActivityEmpty({ filter, onShowAll }: { filter: ActivityFilter; onShowAll: () => void }) {
	const label = getActivityFilterLabel(filter);
	return (
		<Stack align="center" gap="sm" py="xl">
			<Text fw={700}>{filter === "all" ? "No activity yet" : `No ${label} activity`}</Text>
			<Text c="dimmed" maw={300} size="sm" ta="center">
				{filter === "all"
					? "Changes to items and treasury will appear here."
					: `No ${label} changes are recorded for this character.`}
			</Text>
			{filter !== "all" && (
				<Button onClick={onShowAll} style={{ minHeight: 44 }} variant="light">
					Show all activity
				</Button>
			)}
		</Stack>
	);
}

function ActivityInitialError({ onRetry }: { onRetry: () => void }) {
	return (
		<Alert color="red" title="Activity unavailable" variant="light">
			<Text size="sm">The activity log could not be loaded.</Text>
			<Button mt="sm" onClick={onRetry} style={{ minHeight: 44 }} variant="light">
				Retry activity
			</Button>
		</Alert>
	);
}

export function ActivityPaginationError({ onRetry }: { onRetry: () => void }) {
	return (
		<Alert color="red" mt="md" title="More activity unavailable" variant="light">
			<Button onClick={onRetry} style={{ minHeight: 44 }} variant="light">
				Try loading more
			</Button>
		</Alert>
	);
}
