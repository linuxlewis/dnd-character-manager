import {
	Alert,
	Badge,
	Button,
	Group,
	Loader,
	Paper,
	SimpleGrid,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import {
	apiMutations,
	apiQueries,
	apiQueryKeys,
	type CreateCharacterItemRequest,
	type UpdateCharacterItemRequest,
} from "../../../generated/api-client.generated.js";
import type { InventoryItem } from "../types/index.js";
import { characterItemsQueryPrefix, reconcileItem } from "./inventory-cache.js";
import { InventoryCountsAlert } from "./inventory-counts-alert.js";
import { getInventoryErrorMessage, toInventoryError } from "./inventory-errors.js";
import { type InventoryFilter, InventoryFilterBar } from "./inventory-filter-bar.js";
import { ItemCard } from "./item-card.js";
import { ItemDetailDrawer } from "./item-detail-drawer.js";
import { ItemForm } from "./item-form.js";

export function CharacterInventory({ characterId }: { characterId: string }) {
	const queryClient = useQueryClient();
	const [searchInput, setSearchInput] = useState("");
	const [activeType, setActiveType] = useState<InventoryFilter>("all");
	const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
	const [formItem, setFormItem] = useState<InventoryItem | undefined>();
	const [formMode, setFormMode] = useState<"create" | "edit">("create");
	const [formOpen, setFormOpen] = useState(false);
	const [formVersion, setFormVersion] = useState(0);
	const [mutationError, setMutationError] = useState<Error | null>(null);
	const deferredSearch = useDeferredValue(searchInput.trim());
	const [search] = useDebouncedValue(deferredSearch, 300);
	const activeFilter = {
		search: search || undefined,
		type: activeType === "all" ? undefined : activeType,
	};
	const countFilter = { search: search || undefined };

	const inventoryQuery = useQuery({
		...apiQueries.listCharacterItems({ characterId }, activeFilter),
		retry: false,
	});
	const countQueryOptions = apiQueries.listCharacterItems({ characterId }, countFilter);
	const countsQuery = useQuery({
		...countQueryOptions,
		// Keep the list and count observers separate while reusing the generated request.
		queryKey: [
			...countQueryOptions.queryKey,
			"counts",
		] as unknown as typeof countQueryOptions.queryKey,
		retry: false,
	});
	const detailQuery = useQuery({
		...apiQueries.getCharacterItemDetails({
			characterId,
			itemId: selectedItem?.id ?? "00000000-0000-4000-8000-000000000000",
		}),
		enabled: selectedItem !== null,
		retry: false,
	});
	const detailItem = detailQuery.data?.item ?? selectedItem;
	const items = inventoryQuery.data?.items ?? [];
	const countItems = countsQuery.error ? null : (countsQuery.data?.items ?? null);
	const totalCount = countsQuery.error ? null : (countsQuery.data?.total ?? null);

	const createMutation = useMutation({
		...apiMutations.createCharacterItem(),
		onError: (error) => setMutationError(toInventoryError(error)),
		onSuccess: (response) => {
			setMutationError(null);
			setFormOpen(false);
			reconcileItem(queryClient, characterId, response.item);
		},
	});
	const updateMutation = useMutation({
		...apiMutations.updateCharacterItem(),
		onError: (error) => setMutationError(toInventoryError(error)),
		onSuccess: (response) => {
			setMutationError(null);
			setFormOpen(false);
			setSelectedItem(response.item);
			reconcileItem(queryClient, characterId, response.item);
		},
	});
	const equipMutation = useMutation({
		...apiMutations.equipCharacterItem(),
		onError: (error) => setMutationError(toInventoryError(error)),
		onSuccess: (response) => {
			setMutationError(null);
			setSelectedItem(response.item);
			reconcileItem(queryClient, characterId, response.item);
		},
	});
	const unequipMutation = useMutation({
		...apiMutations.unequipCharacterItem(),
		onError: (error) => setMutationError(toInventoryError(error)),
		onSuccess: (response) => {
			setMutationError(null);
			setSelectedItem(response.item);
			reconcileItem(queryClient, characterId, response.item);
		},
	});
	const deleteMutation = useMutation({
		...apiMutations.deleteCharacterItem(),
		onError: (error) => setMutationError(toInventoryError(error)),
		onSuccess: () => {
			setMutationError(null);
			if (selectedItem) {
				queryClient.removeQueries({
					queryKey: apiQueryKeys.getCharacterItemDetails({ characterId, itemId: selectedItem.id }),
				});
			}
			setSelectedItem(null);
			void queryClient.invalidateQueries({ queryKey: characterItemsQueryPrefix(characterId) });
		},
	});
	const mutationsPending =
		createMutation.isPending ||
		updateMutation.isPending ||
		equipMutation.isPending ||
		unequipMutation.isPending ||
		deleteMutation.isPending;

	function openCreateForm() {
		setMutationError(null);
		setFormItem(undefined);
		setFormMode("create");
		setFormVersion((version) => version + 1);
		setFormOpen(true);
	}

	function openEditForm() {
		if (!detailItem) return;
		setMutationError(null);
		setFormItem(detailItem);
		setFormMode("edit");
		setFormVersion((version) => version + 1);
		setSelectedItem(null);
		setFormOpen(true);
	}

	function submitForm(request: CreateCharacterItemRequest | UpdateCharacterItemRequest) {
		if (formMode === "create") {
			createMutation.mutate({
				params: { characterId },
				body: request as CreateCharacterItemRequest,
			});
			return;
		}
		if (formItem) {
			updateMutation.mutate({
				params: { characterId, itemId: formItem.id },
				body: request as UpdateCharacterItemRequest,
			});
		}
	}

	function performEquip() {
		if (!detailItem) return;
		equipMutation.mutate({ characterId, itemId: detailItem.id });
	}

	function performUnequip() {
		if (!detailItem) return;
		unequipMutation.mutate({ characterId, itemId: detailItem.id });
	}

	function performDelete() {
		if (!detailItem) return;
		deleteMutation.mutate({ characterId, itemId: detailItem.id });
	}

	return (
		<Paper data-testid="personal-inventory" p={{ base: "md", sm: "lg" }} withBorder>
			<Stack gap="md">
				<Group align="flex-start" justify="space-between" wrap="wrap">
					<Stack gap={2}>
						<Group gap="xs">
							<Text fw={700} size="lg">
								Personal inventory
							</Text>
							<Badge color="candle" variant="light">
								{totalCount === null ? "Item count unavailable" : `${totalCount} items`}
							</Badge>
						</Group>
						<Text c="dimmed" size="sm">
							Your character's carried gear, equipment, and magical finds.
						</Text>
					</Stack>
					<Button onClick={openCreateForm}>Add item</Button>
				</Group>

				<Group align="flex-end" gap="sm" grow wrap="wrap">
					<TextInput
						aria-label="Search personal inventory"
						label="Search items"
						placeholder="Search by item name"
						value={searchInput}
						onChange={(event) => setSearchInput(event.currentTarget.value)}
					/>
					<Text c="dimmed" size="sm" pb={8}>
						{inventoryQuery.data ? `${inventoryQuery.data.total} matching` : ""}
					</Text>
				</Group>

				{countsQuery.error && <InventoryCountsAlert onRetry={() => void countsQuery.refetch()} />}

				<InventoryFilterBar
					activeType={activeType}
					countItems={countItems}
					onChange={setActiveType}
					totalCount={totalCount}
				/>

				{inventoryQuery.isLoading && (
					<Group justify="center" py="xl">
						<Loader size="sm" />
						<Text c="dimmed">Loading personal inventory...</Text>
					</Group>
				)}
				{inventoryQuery.error && (
					<Alert color="red" title="Personal inventory unavailable" variant="light">
						{getInventoryErrorMessage(inventoryQuery.error)}
						<Button mt="sm" onClick={() => void inventoryQuery.refetch()} size="sm" variant="light">
							Retry inventory
						</Button>
					</Alert>
				)}
				{!inventoryQuery.isLoading && !inventoryQuery.error && items.length === 0 && (
					<Paper bg="dark.7" p="xl" radius="sm" withBorder>
						<Stack align="center" gap="sm">
							<Text fw={700}>
								{search || activeType !== "all" ? "No items match" : "No personal items yet"}
							</Text>
							<Text c="dimmed" ta="center" size="sm">
								{search || activeType !== "all"
									? "Try another search or type filter."
									: "Add a custom item or search the local SRD catalogue to get started."}
							</Text>
							{!search && activeType === "all" && (
								<Button onClick={openCreateForm} variant="light">
									Add your first item
								</Button>
							)}
						</Stack>
					</Paper>
				)}
				{!inventoryQuery.isLoading && !inventoryQuery.error && items.length > 0 && (
					<SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
						{items.map((item) => (
							<ItemCard item={item} key={item.id} onClick={() => setSelectedItem(item)} />
						))}
					</SimpleGrid>
				)}

				{mutationError && !formOpen && (
					<Alert color="red" title="Inventory action failed" variant="light">
						{mutationError.message}
					</Alert>
				)}
			</Stack>

			<ItemForm
				error={mutationError}
				initialItem={formItem}
				key={`${formMode}-${formVersion}-${formItem?.id ?? "new"}`}
				mode={formMode}
				onClose={() => setFormOpen(false)}
				onSubmit={submitForm}
				opened={formOpen}
				pending={mutationsPending}
			/>
			<ItemDetailDrawer
				error={mutationError}
				item={detailItem}
				onClose={() => setSelectedItem(null)}
				onDelete={performDelete}
				onEdit={openEditForm}
				onEquip={performEquip}
				onUnequip={performUnequip}
				opened={selectedItem !== null}
				pending={mutationsPending}
			/>
		</Paper>
	);
}
