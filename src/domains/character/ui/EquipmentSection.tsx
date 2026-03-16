import { Package, Shield, Sword, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../../app/components/ui/badge.tsx";
import { Button } from "../../../app/components/ui/button.tsx";
import { Progress } from "../../../app/components/ui/progress.tsx";
import { cn } from "../../../app/lib/utils.ts";
import {
	ITEM_CATEGORY_LABELS,
	calculateCarryingCapacity,
	calculateTotalWeight,
} from "../types/equipment.js";
import type { Character, EquipmentItem } from "../types/index.js";
import { AddEquipmentForm } from "./AddEquipmentForm.tsx";

interface EquipmentSectionProps {
	characterId: string;
	equipment: EquipmentItem[];
	strScore: number;
	readOnly?: boolean;
	onUpdate: (character: Character) => void;
}

export function EquipmentSection({
	characterId,
	equipment,
	strScore,
	readOnly = false,
	onUpdate,
}: EquipmentSectionProps) {
	const totalWeight = calculateTotalWeight(equipment);
	const capacity = calculateCarryingCapacity(strScore);
	const encumbered = totalWeight > capacity;
	const capacityPercent = capacity > 0 ? (totalWeight / capacity) * 100 : 0;
	const equippedItems = equipment.filter((i) => i.equipped);

	const handleRemoveEquipment = (itemId: string, itemName: string) => {
		fetch(
			`/api/characters/${encodeURIComponent(characterId)}/equipment/${encodeURIComponent(itemId)}`,
			{ method: "DELETE" },
		)
			.then((r) => {
				if (!r.ok) throw new Error("Server error");
				return r.json();
			})
			.then((data) => {
				onUpdate(data);
				toast.success(`Removed ${itemName}`);
			})
			.catch(() => {
				toast.error("Failed to remove equipment");
			});
	};

	const handleToggleEquip = (itemId: string, itemName: string, currentlyEquipped: boolean) => {
		fetch(
			`/api/characters/${encodeURIComponent(characterId)}/equipment/${encodeURIComponent(itemId)}/toggle`,
			{ method: "POST" },
		)
			.then((r) => {
				if (!r.ok) throw new Error("Server error");
				return r.json();
			})
			.then((data) => {
				onUpdate(data);
				toast.success(currentlyEquipped ? `Unequipped ${itemName}` : `Equipped ${itemName}`);
			})
			.catch(() => {
				toast.error("Failed to toggle equipment");
			});
	};

	const capacityVariant = encumbered ? "destructive" : capacityPercent > 75 ? "warning" : "default";

	return (
		<section className="mb-6" aria-label="Equipment">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1 flex items-center gap-2">
				<Package className="h-4 w-4 text-steel" aria-hidden="true" />
				Equipment
			</h2>

			<div className="mb-3 space-y-1">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-muted-foreground">
						Weight: {totalWeight} / {capacity} lbs
					</span>
					{encumbered && (
						<Badge variant="destructive" aria-label="Encumbered">
							Encumbered
						</Badge>
					)}
				</div>
				<Progress
					value={totalWeight}
					max={capacity}
					variant={capacityVariant}
					aria-label="Carrying capacity"
				/>
			</div>

			{equippedItems.length > 0 && (
				<div className="mb-3">
					<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
						Equipped
					</div>
					<div className="flex flex-wrap gap-1.5">
						{equippedItems.map((item) => (
							<Badge key={item.id} variant="default" className="gap-1">
								{item.category === "weapon" && <Sword className="h-3 w-3" />}
								{(item.category === "armor" || item.category === "shield") && (
									<Shield className="h-3 w-3" />
								)}
								{item.name}
							</Badge>
						))}
					</div>
				</div>
			)}

			{equipment.length > 0 ? (
				<div className="rounded-lg border border-border overflow-hidden mb-4">
					<div className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
						<span>Item</span>
						<span className="text-center w-16 max-sm:hidden">Type</span>
						<span className="text-center w-12">Qty</span>
						<span className="text-right w-16 max-sm:hidden">Weight</span>
						<span className="w-16">
							<span className="sr-only">Actions</span>
						</span>
					</div>
					{equipment.map((item, i) => (
						<EquipmentRow
							key={item.id}
							item={item}
							index={i}
							readOnly={readOnly}
							onToggle={handleToggleEquip}
							onRemove={handleRemoveEquipment}
						/>
					))}
				</div>
			) : (
				<div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg mb-4">
					<Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
					<p className="text-sm">No equipment yet. Add items below.</p>
				</div>
			)}

			{!readOnly && <AddEquipmentForm characterId={characterId} onUpdate={onUpdate} />}
		</section>
	);
}

function EquipmentRow({
	item,
	index,
	readOnly,
	onToggle,
	onRemove,
}: {
	item: EquipmentItem;
	index: number;
	readOnly: boolean;
	onToggle: (id: string, name: string, equipped: boolean) => void;
	onRemove: (id: string, name: string) => void;
}) {
	return (
		<div
			className={cn(
				"grid grid-cols-[1fr_auto_auto] sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 min-h-[44px] transition-colors",
				index % 2 === 0 ? "bg-card" : "bg-muted/30",
				item.equipped && "ring-1 ring-inset ring-primary/20",
			)}
		>
			<div className="min-w-0">
				<div className="flex items-center gap-1.5">
					<span
						className={cn(
							"font-medium text-sm truncate",
							item.equipped ? "text-primary" : "text-foreground",
						)}
					>
						{item.name}
					</span>
					{item.equipped && (
						<Badge variant="default" className="text-[10px] px-1 py-0 shrink-0">
							E
						</Badge>
					)}
				</div>
				{item.description && (
					<p className="text-xs text-muted-foreground truncate">{item.description}</p>
				)}
			</div>
			<span className="text-xs text-muted-foreground text-center w-16 truncate max-sm:hidden">
				{ITEM_CATEGORY_LABELS[item.category] ?? item.category}
			</span>
			<span className="text-sm text-muted-foreground text-center w-12">x{item.quantity}</span>
			<span className="text-sm text-muted-foreground text-right w-16 max-sm:hidden">
				{item.weight * item.quantity} lbs
			</span>
			{!readOnly && (
				<div className="flex gap-0.5 w-16 justify-end">
					<Button
						variant={item.equipped ? "primary-ghost" : "ghost"}
						size="icon"
						className="h-8 w-8"
						onClick={() => onToggle(item.id, item.name, item.equipped)}
						aria-label={item.equipped ? `Unequip ${item.name}` : `Equip ${item.name}`}
					>
						<Shield className="h-3.5 w-3.5" />
					</Button>
					<Button
						variant="destructive-ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => onRemove(item.id, item.name)}
						aria-label={`Remove ${item.name}`}
					>
						<X className="h-3.5 w-3.5" />
					</Button>
				</div>
			)}
		</div>
	);
}
