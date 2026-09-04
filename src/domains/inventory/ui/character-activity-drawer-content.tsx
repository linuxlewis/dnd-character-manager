import { Alert, Box, Button, Stack, Text } from "@mantine/core";
import type { CharacterHistoryEntry } from "../types/index.js";
import { ActivityEntry } from "./activity-entry.js";
import {
	type ActivityFilter,
	getActivityFilterLabel,
	groupActivityEntries,
} from "./activity-format.js";

export function ActivityGroups({ entries }: { entries: CharacterHistoryEntry[] }) {
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

export function ActivityEmpty({
	filter,
	onShowAll,
}: {
	filter: ActivityFilter;
	onShowAll: () => void;
}) {
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

export function ActivityInitialError({ onRetry }: { onRetry: () => void }) {
	return (
		<Alert color="red" title="Activity unavailable" variant="light">
			<Text size="sm">The activity log could not be loaded.</Text>
			<Button mt="sm" onClick={onRetry} style={{ minHeight: 44 }} variant="light">
				Retry activity
			</Button>
		</Alert>
	);
}

export function ActivityPaginationError({
	onRetry,
	retryLabel = "Try loading more",
	title = "More activity unavailable",
}: {
	onRetry: () => void;
	retryLabel?: string;
	title?: string;
}) {
	return (
		<Alert color="red" mt="md" title={title} variant="light">
			<Button onClick={onRetry} style={{ minHeight: 44 }} variant="light">
				{retryLabel}
			</Button>
		</Alert>
	);
}
