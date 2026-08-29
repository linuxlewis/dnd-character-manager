import {
	Alert,
	Badge,
	Button,
	Divider,
	Drawer,
	Group,
	Modal,
	SimpleGrid,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useState } from "react";
import type { InventoryItem } from "../types/index.js";
import { ItemThumbnail } from "./item-card.js";
import {
	formatItemNumber,
	formatItemProperty,
	formatLabel,
	getItemRarityLabel,
	getItemRarityStyle,
	getItemStatEntries,
	getItemTypeIcon,
	getItemTypeLabel,
} from "./item-presentation.js";

export function ItemDetailDrawer({
	item,
	opened,
	pending,
	error,
	onClose,
	onEdit,
	onEquip,
	onUnequip,
	onDelete,
	withinPortal = true,
}: {
	item: InventoryItem | null;
	opened: boolean;
	pending: boolean;
	error: Error | null;
	onClose: () => void;
	onEdit: () => void;
	onEquip: () => void;
	onUnequip: () => void;
	onDelete: () => void;
	withinPortal?: boolean;
}) {
	const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
	if (!item) return null;

	const rarityStyle = getItemRarityStyle(item.rarity);
	const TypeIcon = getItemTypeIcon(item.type);
	const stats = getItemStatEntries(item);
	const tags = item.properties.tags;

	return (
		<>
			<Drawer
				aria-label={`${item.name} details`}
				closeButtonProps={{ "aria-label": `Close ${item.name} details` }}
				onClose={onClose}
				opened={opened}
				position="right"
				size="md"
				title={
					<Group gap="sm" wrap="nowrap">
						<ItemThumbnail item={item} size={44} />
						<Stack gap={2}>
							<Title order={3} size="h4">
								{item.name}
							</Title>
							<Text c="dimmed" size="sm">
								{getItemTypeLabel(item.type)}
							</Text>
						</Stack>
					</Group>
				}
				withinPortal={withinPortal}
			>
				<Stack gap="lg">
					<Group gap="xs" wrap="wrap">
						<Badge color={rarityStyle.color} variant="light">
							{getItemRarityLabel(item.rarity)}
						</Badge>
						<Badge color="candle" variant="light">
							x{item.quantity}
						</Badge>
						{item.isEquipped && (
							<Badge color="teal" variant="light">
								Equipped
							</Badge>
						)}
					</Group>

					{error && (
						<Alert color="red" title="Item action failed" variant="light">
							{error.message}
						</Alert>
					)}

					<SimpleGrid cols={2} spacing="sm">
						<DetailValue label="Type" value={getItemTypeLabel(item.type)} />
						<DetailValue label="Category" value={item.category} />
						<DetailValue label="Weight" value={formatItemNumber(item.weight, "lb")} />
						<DetailValue label="Value" value={formatItemNumber(item.estimatedValue, "GP")} />
					</SimpleGrid>

					{item.description && (
						<DetailSection label="Description">
							<Text style={{ whiteSpace: "pre-wrap" }}>{item.description}</Text>
						</DetailSection>
					)}

					{stats.length > 0 && (
						<DetailSection label="Key stats">
							<Stack gap="xs">
								{stats.map((stat) => (
									<DetailValue key={stat.label} label={stat.label} value={stat.value} />
								))}
							</Stack>
						</DetailSection>
					)}

					{Array.isArray(tags) && tags.length > 0 && (
						<DetailSection label="Properties">
							<Group gap="xs">
								{tags.map(
									(tag) =>
										typeof tag === "string" && (
											<Badge key={tag} color="gray" variant="outline">
												{tag}
											</Badge>
										),
								)}
							</Group>
						</DetailSection>
					)}

					{item.notes && (
						<DetailSection label="Notes">
							<Text c="yellow.3" style={{ whiteSpace: "pre-wrap" }}>
								{item.notes}
							</Text>
						</DetailSection>
					)}

					{item.catalogueRulesVersion && (
						<DetailSection label="Catalogue provenance">
							<Stack gap={2}>
								<Text size="sm">Local SRD snapshot</Text>
								<Text c="dimmed" size="xs">
									Rules {item.catalogueRulesVersion}
								</Text>
								{item.catalogueSourceKey && (
									<Text c="dimmed" size="xs">
										Source {item.catalogueSourceKey}
									</Text>
								)}
							</Stack>
						</DetailSection>
					)}

					<Divider />
					<Group grow wrap="wrap">
						<Button disabled={pending} onClick={onEdit} variant="light">
							Edit
						</Button>
						<Button
							disabled={pending}
							onClick={item.isEquipped ? onUnequip : onEquip}
							variant="default"
						>
							{item.isEquipped ? "Unequip" : "Equip"}
						</Button>
						<Button
							color="red"
							disabled={pending}
							onClick={() => setDeleteConfirmationOpen(true)}
							variant="subtle"
						>
							Delete
						</Button>
					</Group>
					{item.isEquipped && (
						<Text c="dimmed" size="xs">
							<TypeIcon aria-hidden="true" size={13} /> This item is currently equipped.
						</Text>
					)}
				</Stack>
			</Drawer>

			<Modal
				centered
				closeButtonProps={{ "aria-label": "Close delete confirmation" }}
				onClose={() => setDeleteConfirmationOpen(false)}
				opened={deleteConfirmationOpen}
				title="Delete item?"
			>
				<Stack gap="md">
					<Text>Delete {item.name}? This cannot be undone.</Text>
					<Group justify="flex-end">
						<Button
							disabled={pending}
							onClick={() => setDeleteConfirmationOpen(false)}
							variant="default"
						>
							Cancel
						</Button>
						<Button color="red" loading={pending} onClick={onDelete}>
							Delete item
						</Button>
					</Group>
				</Stack>
			</Modal>
		</>
	);
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<Stack gap="xs">
			<Text c="dimmed" fw={700} size="xs" tt="uppercase">
				{label}
			</Text>
			{children}
		</Stack>
	);
}

function DetailValue({ label, value }: { label: string; value: string | null }) {
	return (
		<Stack gap={2}>
			<Text c="dimmed" size="xs">
				{label}
			</Text>
			<Text size="sm">{value ?? "Not listed"}</Text>
		</Stack>
	);
}

export function formatItemProperties(item: InventoryItem) {
	return Object.entries(item.properties)
		.filter(([key]) => !["stats", "tags"].includes(key))
		.map(([key, value]) => `${formatLabel(key)}: ${formatItemProperty(value)}`);
}
