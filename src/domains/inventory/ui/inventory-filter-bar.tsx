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
	countItems: InventoryItem[];
	totalCount: number;
	onChange: (type: InventoryFilter) => void;
}) {
	return (
		<Group
			aria-label="Inventory type filters"
			gap={6}
			role="tablist"
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
					count={countItems.filter((item) => item.type === type).length}
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
	count: number;
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			aria-selected={active}
			onClick={onClick}
			role="tab"
			size="sm"
			style={{ flex: "0 0 auto" }}
			variant={active ? "light" : "default"}
		>
			{label}{" "}
			<Badge color={active ? "candle" : "gray"} ml={4} size="sm" variant="filled">
				{count}
			</Badge>
		</Button>
	);
}
