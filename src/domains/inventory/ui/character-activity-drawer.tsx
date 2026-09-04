import { Button, Drawer, ScrollArea, SegmentedControl, Stack, Text } from "@mantine/core";
import { useQueries } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { apiQueries } from "../../../generated/api-client.generated.js";
import type { CharacterHistoryEntry } from "../types/index.js";
import { ActivitySkeleton } from "./activity-entry.js";
import { type ActivityFilter, appendActivityPage, formatHistoryQuery } from "./activity-format.js";
import {
	ActivityEmpty,
	ActivityGroups,
	ActivityInitialError,
	ActivityPaginationError,
} from "./character-activity-drawer-content.js";
import "./activity.css";

export { ActivityPaginationError } from "./character-activity-drawer-content.js";

const PAGE_SIZE = 20;

type ActivityPaginationState = {
	characterId: string;
	filter: ActivityFilter;
	offsets: number[];
};

type CoherentActivityPageSet = {
	entries: CharacterHistoryEntry[];
	filter: ActivityFilter;
	key: string;
	offsets: number[];
	characterId: string;
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
	const coherentPageSet = useRef<CoherentActivityPageSet | null>(null);
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
	const pageEntries = pageQueries.reduce<CharacterHistoryEntry[]>(
		(loaded, pageQuery) => appendActivityPage(loaded, pageQuery.data?.entries ?? []),
		[],
	);
	const pageSetKey = `${characterId}:${filter}:${offsets.join(",")}`;
	const allPagesLoaded = pageQueries.every((pageQuery) => pageQuery.data !== undefined);
	const anyPageFetching = pageQueries.some((pageQuery) => pageQuery.isFetching);
	const firstPageFetching = pageQueries.some(
		(pageQuery, index) => index === 0 && pageQuery.isFetching,
	);
	const pagesSettled =
		allPagesLoaded && pageQueries.every((pageQuery) => !pageQuery.isFetching && !pageQuery.error);
	const hasMatchingCoherentPageSet = coherentPageSet.current?.key === pageSetKey;
	const hasCoherentPrefix =
		coherentPageSet.current?.characterId === characterId &&
		coherentPageSet.current.filter === filter &&
		offsets.length === coherentPageSet.current.offsets.length + 1 &&
		offsets.every((offset, index) => offset === coherentPageSet.current?.offsets[index]);
	if (pagesSettled) {
		coherentPageSet.current = {
			characterId,
			entries: pageEntries,
			filter,
			key: pageSetKey,
			offsets,
		};
	}
	const entries = pagesSettled
		? pageEntries
		: hasMatchingCoherentPageSet || hasCoherentPrefix
			? (coherentPageSet.current?.entries ?? pageEntries)
			: anyPageFetching
				? []
				: pageEntries;
	const initialLoading =
		(firstQuery?.isLoading ?? false) ||
		(!hasMatchingCoherentPageSet && firstPageFetching) ||
		(entries.length === 0 && hasMatchingCoherentPageSet && anyPageFetching);
	const hasPageError = pageQueries.some((pageQuery) => Boolean(pageQuery.error));
	const hasRetainedPageError = pageQueries.some(
		(pageQuery) => Boolean(pageQuery.error) && pageQuery.data !== undefined,
	);
	const hasPartialError = hasPageError && entries.length > 0;
	const initialError =
		hasPartialError || (hasMatchingCoherentPageSet && entries.length > 0)
			? null
			: firstQuery?.error;
	const loadingMore = offsets.length > 1 && Boolean(lastQuery?.isFetching) && !lastQuery?.data;
	const paginationError = offsets.length > 1 && Boolean(lastQuery?.error) && entries.length > 0;

	function retryFailedPages() {
		for (const pageQuery of pageQueries) {
			if (pageQuery.error) void pageQuery.refetch();
		}
	}

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
			classNames={{ content: "character-activity-drawer-content" }}
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
					{hasPartialError && (
						<ActivityPaginationError
							onRetry={retryFailedPages}
							retryLabel={hasRetainedPageError ? "Retry activity" : undefined}
							title={hasRetainedPageError ? "Activity update incomplete" : undefined}
						/>
					)}
					{!hasPartialError &&
						!paginationError &&
						lastQuery?.data?.hasMore &&
						!loadingMore &&
						!anyPageFetching && (
							<Button
								fullWidth
								mt="md"
								onClick={loadMore}
								style={{ minHeight: 44 }}
								variant="light"
							>
								Load more activity
							</Button>
						)}
				</ScrollArea>
			</Stack>
		</Drawer>
	);
}
