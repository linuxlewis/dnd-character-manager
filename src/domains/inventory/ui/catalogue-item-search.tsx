import { Alert, Badge, Group, Paper, ScrollArea, Stack, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { apiQueries } from "../../../generated/api-client.generated.js";
import type { CatalogueItemSearchResult } from "../../catalogue/types/index.js";

export function CatalogueItemSearch({
	opened,
	selectedCatalogueId,
	detailPendingId,
	detailError,
	onSelect,
}: {
	opened: boolean;
	selectedCatalogueId: string | null;
	detailPendingId: string | null;
	detailError: Error | null;
	onSelect: (item: CatalogueItemSearchResult) => void;
}) {
	const [searchInput, setSearchInput] = useState("");
	const deferredSearch = useDeferredValue(searchInput.trim());
	const [searchText] = useDebouncedValue(deferredSearch, 300);
	const statusQuery = useQuery({
		...apiQueries.getCatalogueStatus(),
		retry: false,
		enabled: opened,
	});
	const catalogueReady = statusQuery.data?.items.readiness === "ready";
	const searchQuery = useQuery({
		...apiQueries.searchCatalogueItems({ q: searchText, limit: 20 }),
		enabled: opened && catalogueReady && searchText.length >= 2,
		retry: false,
	});

	return (
		<Paper bg="dark.7" p="sm" radius="sm" withBorder>
			<Stack gap="sm">
				<Group justify="space-between" wrap="wrap">
					<Stack gap={2}>
						<Text fw={700}>Local SRD catalogue</Text>
						<Text c="dimmed" size="xs">
							Search mundane and magic equipment together, then auto-fill the form.
						</Text>
					</Stack>
					{catalogueReady && (
						<Badge color="teal" variant="light">
							Rules {statusQuery.data?.source.rulesVersion}
						</Badge>
					)}
				</Group>
				{statusQuery.isLoading && (
					<Text c="dimmed" size="sm">
						Checking catalogue readiness...
					</Text>
				)}
				{statusQuery.data?.items.readiness === "unavailable" && (
					<Alert color="yellow" title="SRD catalogue not seeded" variant="light">
						Search is unavailable until local equipment data is seeded. Manual item entry remains
						available.
					</Alert>
				)}
				{statusQuery.error && (
					<Alert color="yellow" title="SRD catalogue unavailable" variant="light">
						The local catalogue could not be reached. Add a custom item below or retry later.
					</Alert>
				)}
				<TextInput
					aria-label="Search SRD catalogue"
					label="Search SRD"
					placeholder="Try longsword, potion, or rope"
					value={searchInput}
					onChange={(event) => setSearchInput(event.currentTarget.value)}
					disabled={!catalogueReady}
				/>
				{searchQuery.isFetching && (
					<Text c="dimmed" size="sm">
						Searching local SRD...
					</Text>
				)}
				{searchQuery.error && (
					<Alert color="red" title="Catalogue search unavailable" variant="light">
						Manual entry is still available. Try the search again later.
					</Alert>
				)}
				{searchQuery.data && searchQuery.data.items.length === 0 && (
					<Text c="dimmed" size="sm">
						No local SRD items match that search.
					</Text>
				)}
				<ScrollArea.Autosize mah={240} offsetScrollbars>
					<Stack gap="xs">
						{searchQuery.data?.items.map((item) => (
							<Paper
								aria-label={`Select catalogue item ${item.name}`}
								bg={selectedCatalogueId === item.id ? "dark.5" : "dark.6"}
								component="button"
								key={item.id}
								onClick={() => onSelect(item)}
								p="sm"
								type="button"
								withBorder
							>
								<Group justify="space-between" wrap="wrap">
									<Stack align="flex-start" gap={2}>
										<Text fw={600} ta="left">
											{item.name}
										</Text>
										<Group gap="xs">
											<Badge color={item.isMagical ? "grape" : "gray"} size="xs" variant="light">
												{item.isMagical ? "Magic item" : "Mundane"}
											</Badge>
											<Text c="dimmed" size="xs">
												{item.category}
											</Text>
										</Group>
									</Stack>
									<Text c="dimmed" size="xs">
										Rules {item.rulesVersion}
									</Text>
								</Group>
								{detailPendingId === item.id && (
									<Text c="dimmed" size="xs">
										Loading item details...
									</Text>
								)}
							</Paper>
						))}
					</Stack>
				</ScrollArea.Autosize>
				{detailError && (
					<Alert color="red" title="Catalogue details unavailable" variant="light">
						The result could not be auto-filled. Enter the item manually.
					</Alert>
				)}
			</Stack>
		</Paper>
	);
}
