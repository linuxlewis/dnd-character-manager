import { Alert, Button, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, History } from "lucide-react";
import { useState } from "react";
import type { ListCharacterHistoryResponse } from "../../../generated/api-client.generated.js";
import { apiQueries } from "../../../generated/api-client.generated.js";
import { ActivityEntry, ActivitySkeleton } from "./activity-entry.js";
import { CharacterActivityDrawer } from "./character-activity-drawer.js";
import "./activity.css";

export function CharacterActivity({
	characterId,
	characterName,
}: {
	characterId: string;
	characterName: string;
}) {
	const [opened, setOpened] = useState(false);
	const query = useQuery({
		...apiQueries.listCharacterHistory({ characterId }, { limit: 1, offset: 0 }),
		retry: false,
		staleTime: 30_000,
	});

	return (
		<Stack data-testid="recent-activity" gap="sm">
			<ActivityPreview onOpen={() => setOpened(true)} query={query} />
			<CharacterActivityDrawer
				key={characterId}
				characterId={characterId}
				characterName={characterName}
				onClose={() => setOpened(false)}
				opened={opened}
			/>
		</Stack>
	);
}

export function ActivityPreview({
	onOpen,
	query,
}: {
	onOpen: () => void;
	query: Pick<
		ReturnType<typeof useQuery<ListCharacterHistoryResponse>>,
		"data" | "error" | "isLoading" | "refetch"
	>;
}) {
	const latestEntry = query.data?.entries[0];

	if (query.isLoading) {
		return (
			<Paper bg="dark.7" p={{ base: "md", sm: "lg" }} withBorder>
				<Stack gap="md">
					<ActivityHeader />
					<ActivitySkeleton />
				</Stack>
			</Paper>
		);
	}

	if (query.error) {
		return <ActivityErrorPreview onRetry={() => void query.refetch()} />;
	}

	const content = latestEntry ? (
		<ActivityEntry compact entry={latestEntry} />
	) : (
		<Stack gap={2} mt="md">
			<Text fw={600} size="sm">
				No activity yet
			</Text>
			<Text c="dimmed" size="sm">
				Changes to items and treasury will appear here.
			</Text>
		</Stack>
	);

	return (
		<UnstyledButton
			aria-label="View inventory activity"
			className="character-activity-preview"
			onClick={onOpen}
			type="button"
		>
			<Paper bg="dark.7" p={{ base: "md", sm: "lg" }} withBorder>
				<Stack gap="md">
					<ActivityHeader showViewAll={Boolean(latestEntry)} />
					{content}
				</Stack>
			</Paper>
		</UnstyledButton>
	);
}

export function ActivityErrorPreview({ onRetry }: { onRetry: () => void }) {
	return (
		<Stack gap="sm">
			<Paper bg="dark.7" p={{ base: "md", sm: "lg" }} withBorder>
				<ActivityHeader />
				<Alert color="red" mt="md" title="Activity unavailable" variant="light">
					Your treasury and inventory are still available.
				</Alert>
			</Paper>
			<Button onClick={onRetry} style={{ minHeight: 44 }} variant="light">
				Retry activity
			</Button>
		</Stack>
	);
}

function ActivityHeader({ showViewAll = false }: { showViewAll?: boolean }) {
	return (
		<Group justify="space-between" wrap="nowrap">
			<Group gap="xs" wrap="nowrap">
				<History aria-hidden="true" size={18} />
				<Text fw={700} size="lg">
					Recent activity
				</Text>
			</Group>
			{showViewAll && (
				<Group c="candle" gap={4} wrap="nowrap">
					<Text size="sm">View all</Text>
					<ChevronRight aria-hidden="true" size={16} />
				</Group>
			)}
		</Group>
	);
}
