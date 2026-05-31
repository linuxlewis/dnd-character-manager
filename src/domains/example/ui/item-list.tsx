/**
 * ItemList — UI component for the example domain.
 *
 * May import from: types, config (client-safe only)
 * Must NOT import from: repo, service, runtime
 *
 * Data fetching uses the API routes defined in the runtime layer.
 * UI components never import server-side code directly.
 */

import {
	Alert,
	Badge,
	Box,
	Button,
	Group,
	Paper,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ApiClientError,
	apiMutations,
	apiQueries,
	apiQueryKeys,
} from "../../../generated/api-client.generated.js";

interface ItemFormValues {
	name: string;
}

export function ItemList() {
	const queryClient = useQueryClient();
	const form = useForm<ItemFormValues>({
		mode: "controlled",
		initialValues: { name: "" },
		validate: {
			name: (value) => (value.trim().length === 0 ? "Name is required" : null),
		},
	});

	const itemsQuery = useQuery(apiQueries.listItems());

	const createMutation = useMutation({
		...apiMutations.createItem(),
		onSuccess: async () => {
			form.reset();
			await queryClient.invalidateQueries({ queryKey: apiQueryKeys.listItems() });
		},
	});

	const deleteMutation = useMutation({
		...apiMutations.deleteItem(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: apiQueryKeys.listItems() });
		},
	});

	const error = getErrorMessage(itemsQuery.error ?? createMutation.error ?? deleteMutation.error);

	function createItem(values: ItemFormValues) {
		createMutation.mutate({ name: values.name.trim(), status: "draft" });
	}

	if (itemsQuery.isLoading) {
		return (
			<Paper withBorder p="lg">
				<Text c="dimmed">Loading...</Text>
			</Paper>
		);
	}

	const items = itemsQuery.data ?? [];
	return (
		<Paper withBorder p="lg">
			<Stack gap="md">
				<Group justify="space-between" align="flex-start">
					<Stack gap={4}>
						<Title order={2} size="h4">
							Items
						</Title>
						<Text c="dimmed" size="sm">
							Temporary scaffold data kept until the first character domain replaces it.
						</Text>
					</Stack>
					<Badge color="bloodstone" variant="light">
						Scaffold
					</Badge>
				</Group>

				{error && (
					<Alert color="red" title="Request failed" variant="light">
						{error}
					</Alert>
				)}

				<Box component="form" onSubmit={form.onSubmit(createItem)}>
					<Group align="flex-end" gap="sm">
						<TextInput
							{...form.getInputProps("name")}
							flex={1}
							label="Scaffold item"
							placeholder="New item name..."
						/>
						<Button type="submit" loading={createMutation.isPending}>
							Add
						</Button>
					</Group>
				</Box>

				{items.length === 0 ? (
					<Text c="dimmed" size="sm">
						No items yet. Create one above.
					</Text>
				) : (
					<Stack gap="xs">
						{items.map((item) => (
							<Group key={item.id} justify="space-between" wrap="nowrap">
								<Group gap="xs">
									<Text fw={600}>{item.name}</Text>
									<Badge color="gray" size="sm" variant="outline">
										{item.status}
									</Badge>
								</Group>
								<Button
									color="red"
									onClick={() => deleteMutation.mutate({ id: item.id })}
									size="xs"
									type="button"
									variant="subtle"
								>
									Delete
								</Button>
							</Group>
						))}
					</Stack>
				)}
			</Stack>
		</Paper>
	);
}

function getErrorMessage(error: unknown) {
	if (!error) return null;
	if (error instanceof ApiClientError) return `HTTP ${error.status}`;
	return error instanceof Error ? error.message : "Request failed";
}
