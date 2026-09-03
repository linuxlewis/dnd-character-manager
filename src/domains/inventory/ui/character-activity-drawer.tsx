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
import { useQueries } from "@tanstack/react-query";
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
	filter: ActivityFilter;
	offsets: number[];
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
		filter: "all",
		offsets: [0],
	});
	const sameCharacter = pagination.characterId === characterId;
	const filter = sameCharacter ? pagination.filter : "all";
	const offsets = sameCharacter ? pagination.offsets : [0];
	const pageQueries = useQueries({
		queries: offsets.map((offset) => ({
			...apiQueries.listCharacterHistory(
				{ characterId },
				formatHistoryQuery(filter, offset, PAGE_SIZE),
			),
			enabled: opened,
			retry: false,
			staleTime: 30_000,
		})),
	});
	const firstQuery = pageQueries[0];
	const lastQuery = pageQueries[pageQueries.length - 1];
	const entries = pageQueries.reduce<CharacterHistoryEntry[]>(
		(loaded, pageQuery) => appendActivityPage(loaded, pageQuery.data?.entries ?? []),
		[],
	);
	const initialLoading = firstQuery?.isLoading ?? false;
	const initialError = firstQuery?.error;
	const loadingMore = offsets.length > 1 && Boolean(lastQuery?.isFetching);
	const paginationError = offsets.length > 1 && Boolean(lastQuery?.error) && entries.length > 0;

	function changeFilter(nextFilter: string) {
		if (nextFilter !== "all" && nextFilter !== "items" && nextFilter !== "treasury") return;
		setPagination({ characterId, filter: nextFilter, offsets: [0] });
	}

	function loadMore() {
		if (!lastQuery?.data?.hasMore || lastQuery.isFetching) return;
		setPagination({
			characterId,
			filter,
			offsets: [...offsets, lastQuery.data.offset + lastQuery.data.limit],
		});
	}

	return (
		<Drawer
			aria-label="Inventory activity"
			closeButtonProps={{
				"aria-label": "Close inventory activity",
				size: "lg",
				style: { minHeight: 44, minWidth: 44 },
			}}
			onClose={onClose}
			opened={opened}
			position="right"
			size={480}
			styles={{
				body: {
					display: "flex",
					flex: "1 1 auto",
					flexDirection: "column",
					minHeight: 0,
					paddingBottom: "calc(var(--mantine-spacing-lg) + env(safe-area-inset-bottom))",
				},
				content: {
					display: "flex",
					flexDirection: "column",
					height: "100dvh",
					maxWidth: "100vw",
					width: "min(480px, 100vw)",
				},
			}}
			title="Inventory activity"
			withinPortal={withinPortal}
		>
			<Stack gap="md" style={{ flex: "1 1 auto", minHeight: 0 }}>
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

				<ScrollArea
					className="character-activity-scroll"
					offsetScrollbars
					styles={{ viewport: { height: "100%" } }}
					style={{ flex: "1 1 auto", minHeight: 0 }}
				>
					{offsets.length === 1 && initialLoading && <ActivitySkeleton count={4} />}
					{offsets.length === 1 && initialError && (
						<ActivityInitialError onRetry={() => void firstQuery?.refetch()} />
					)}
					{!initialLoading && !initialError && entries.length === 0 && (
						<ActivityEmpty filter={filter} onShowAll={() => changeFilter("all")} />
					)}
					{entries.length > 0 && <ActivityGroups entries={entries} />}
					{loadingMore && <ActivitySkeleton count={2} />}
					{paginationError && <ActivityPaginationError onRetry={() => void lastQuery?.refetch()} />}
					{!paginationError && lastQuery?.data?.hasMore && !loadingMore && (
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
							className="character-activity-group-rail"
							style={{
								backgroundColor: "var(--mantine-color-dark-4)",
								bottom: 16,
								position: "absolute",
								top: 16,
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
