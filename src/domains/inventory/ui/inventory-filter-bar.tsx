import { Badge, Button, Group } from "@mantine/core";
import type { InventoryItem, InventoryItemType } from "../types/index.js";
import { INVENTORY_ITEM_TYPES, ITEM_TYPE_LABELS } from "./item-presentation.js";

export type InventoryFilter = "all" | InventoryItemType;

export function InventoryFilterBar({
	activeType,
	countItems,
	totalCount,
	onChange,
}: {
	activeType: InventoryFilter;
	countItems: InventoryItem[] | null;
	totalCount: number | null;
	onChange: (type: InventoryFilter) => void;
}) {
	return (
		<Group
			aria-label="Inventory type filters"
			gap={6}
			role="group"
			style={{ overflowX: "auto", paddingBottom: 2 }}
			wrap="nowrap"
		>
			<FilterButton
				active={activeType === "all"}
				count={totalCount}
				label="All"
				onClick={() => onChange("all")}
			/>
			{INVENTORY_ITEM_TYPES.map((type) => (
				<FilterButton
					active={activeType === type}
					count={countItems ? countItems.filter((item) => item.type === type).length : null}
					key={type}
					label={ITEM_TYPE_LABELS[type]}
					onClick={() => onChange(type)}
				/>
			))}
		</Group>
	);
}

function FilterButton({
	active,
	count,
	label,
	onClick,
}: {
	active: boolean;
	count: number | null;
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			aria-label={count === null ? `${label}, count unavailable` : undefined}
			aria-pressed={active}
			onClick={onClick}
			size="sm"
			style={{ flex: "0 0 auto" }}
			variant={active ? "light" : "default"}
		>
			{label}{" "}
			<Badge color={active ? "candle" : "gray"} ml={4} size="sm" variant="filled">
				{count === null ? "-" : count}
			</Badge>
		</Button>
	);
}
