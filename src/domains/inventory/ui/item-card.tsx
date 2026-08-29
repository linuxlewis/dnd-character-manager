import { Badge, Card, Group, Image, Stack, Text } from "@mantine/core";
import type { InventoryItem } from "../types/index.js";
import {
	formatItemNumber,
	getItemRarityLabel,
	getItemRarityStyle,
	getItemTypeIcon,
	getItemTypeLabel,
} from "./item-presentation.js";

export function ItemCard({ item, onClick }: { item: InventoryItem; onClick: () => void }) {
	const rarityStyle = getItemRarityStyle(item.rarity);
	const TypeIcon = getItemTypeIcon(item.type);

	return (
		<Card
			aria-label={`View ${item.name}`}
			component="button"
			data-testid={`inventory-item-${item.id}`}
			onClick={onClick}
			p={0}
			radius="sm"
			style={{ borderColor: `var(--mantine-color-${rarityStyle.border.replace(".", "-")})` }}
			type="button"
			withBorder
		>
			<Group align="stretch" gap={0} wrap="nowrap">
				<div
					aria-hidden="true"
					style={{ backgroundColor: `var(--mantine-color-${rarityStyle.color}-6)`, width: 5 }}
				/>
				<Stack align="stretch" gap="sm" p="md" style={{ flex: 1, minWidth: 0 }}>
					<Group align="flex-start" gap="sm" wrap="nowrap">
						<ItemThumbnail item={item} size={52} />
						<Stack gap={4} style={{ minWidth: 0 }}>
							<Text fw={700} lineClamp={2} ta="left">
								{item.name}
							</Text>
							<Group gap={6} wrap="wrap">
								<Badge color={rarityStyle.color} size="sm" variant="light">
									{getItemRarityLabel(item.rarity)}
								</Badge>
								<Badge color="candle" size="sm" variant="light">
									x{item.quantity}
								</Badge>
							</Group>
						</Stack>
					</Group>
					<Group gap="xs" justify="space-between" wrap="wrap">
						<Group c="dimmed" gap={5} wrap="nowrap">
							<TypeIcon aria-hidden="true" size={15} />
							<Text size="sm">{getItemTypeLabel(item.type)}</Text>
							<Text size="sm">·</Text>
							<Text size="sm">{item.category}</Text>
						</Group>
						<Group c="dimmed" gap="xs">
							{formatItemNumber(item.weight, "lb") && (
								<Text size="xs">{formatItemNumber(item.weight, "lb")}</Text>
							)}
							{formatItemNumber(item.estimatedValue, "GP") && (
								<Text size="xs">{formatItemNumber(item.estimatedValue, "GP")}</Text>
							)}
						</Group>
					</Group>
					{item.isEquipped && (
						<Badge color="teal" leftSection="" size="sm" variant="dot" w="fit-content">
							Equipped
						</Badge>
					)}
				</Stack>
			</Group>
		</Card>
	);
}

export function ItemThumbnail({ item, size = 64 }: { item: InventoryItem; size?: number }) {
	const TypeIcon = getItemTypeIcon(item.type);
	const rarityStyle = getItemRarityStyle(item.rarity);

	return item.thumbnailUrl ? (
		<Image alt="" fit="cover" h={size} radius="sm" src={item.thumbnailUrl} w={size} />
	) : (
		<Group
			aria-label={`${getItemTypeLabel(item.type)} icon`}
			bg={rarityStyle.background}
			c={rarityStyle.color}
			h={size}
			justify="center"
			style={{ borderRadius: "var(--mantine-radius-sm)" }}
			w={size}
		>
			<TypeIcon aria-hidden="true" size={Math.max(22, Math.round(size * 0.5))} />
		</Group>
	);
}
