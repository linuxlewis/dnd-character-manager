import { Package, Plus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../app/components/ui/button.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
import { Label } from "../../../app/components/ui/label.tsx";
import { cn } from "../../../app/lib/utils.ts";
import { calculateTotalWeight } from "../types/character.js";
import type { Character, EquipmentItem } from "../types/index.js";

interface EquipmentSectionProps {
	characterId: string;
	equipment: EquipmentItem[];
	onUpdate: (character: Character) => void;
}

export function EquipmentSection({ characterId, equipment, onUpdate }: EquipmentSectionProps) {
	const [eqName, setEqName] = useState("");
	const [eqQty, setEqQty] = useState("1");
	const [eqWeight, setEqWeight] = useState("0");

	const handleAddEquipment = (e: FormEvent) => {
		e.preventDefault();
		const quantity = Number.parseInt(eqQty, 10);
		const weight = Number.parseFloat(eqWeight);
		if (!eqName.trim() || Number.isNaN(quantity) || Number.isNaN(weight)) return;
		fetch(`/api/characters/${characterId}/equipment`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: eqName.trim(), quantity, weight, equipped: false }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					onUpdate(data);
					toast.success(`Added ${eqName.trim()}`);
					setEqName("");
					setEqQty("1");
					setEqWeight("0");
				}
			})
			.catch(() => {
				toast.error("Failed to add equipment");
			});
	};

	const handleRemoveEquipment = (itemId: string, itemName: string) => {
		fetch(`/api/characters/${characterId}/equipment/${itemId}`, { method: "DELETE" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					onUpdate(data);
					toast.success(`Removed ${itemName}`);
				}
			})
			.catch(() => {
				toast.error("Failed to remove equipment");
			});
	};

	return (
		<section className="mb-6" aria-label="Equipment">
			<h2 className="text-base font-semibold text-foreground mb-2 border-b border-border pb-1 flex items-center gap-2">
				<Package className="h-4 w-4 text-steel" aria-hidden="true" />
				Equipment
			</h2>
			<div className="text-sm font-semibold mb-2 text-muted-foreground">
				Total Weight: {calculateTotalWeight(equipment)} lbs
			</div>

			{equipment.length > 0 ? (
				<div className="rounded-lg border border-border overflow-hidden mb-4">
					<div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
						<span>Item</span>
						<span className="text-center w-12">Qty</span>
						<span className="text-right w-16">Weight</span>
						<span className="w-8">
							<span className="sr-only">Actions</span>
						</span>
					</div>
					{equipment.map((item, i) => (
						<div
							key={item.id}
							className={cn(
								"grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center px-3 min-h-[44px] transition-colors",
								i % 2 === 0 ? "bg-card" : "bg-muted/30",
							)}
						>
							<span className="font-medium text-sm text-foreground truncate">{item.name}</span>
							<span className="text-sm text-muted-foreground text-center w-12">
								x{item.quantity}
							</span>
							<span className="text-sm text-muted-foreground text-right w-16">
								{item.weight * item.quantity} lbs
							</span>
							<Button
								variant="destructive-ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => handleRemoveEquipment(item.id, item.name)}
								aria-label={`Remove ${item.name}`}
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
					))}
				</div>
			) : (
				<div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg mb-4">
					<Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
					<p className="text-sm">No equipment yet. Add items below.</p>
				</div>
			)}
			<form
				className="flex gap-2 flex-wrap max-sm:flex-col"
				onSubmit={handleAddEquipment}
				aria-label="Add equipment"
			>
				<div className="flex-1 min-w-[120px]">
					<Label htmlFor="eq-name" className="sr-only">
						Item name
					</Label>
					<Input
						id="eq-name"
						type="text"
						placeholder="Item name"
						value={eqName}
						onChange={(e) => setEqName(e.target.value)}
						required
					/>
				</div>
				<div className="w-[70px] max-sm:w-full">
					<Label htmlFor="eq-qty" className="sr-only">
						Quantity
					</Label>
					<Input
						id="eq-qty"
						type="number"
						placeholder="Qty"
						value={eqQty}
						onChange={(e) => setEqQty(e.target.value)}
						min="1"
						required
					/>
				</div>
				<div className="w-[70px] max-sm:w-full">
					<Label htmlFor="eq-weight" className="sr-only">
						Weight
					</Label>
					<Input
						id="eq-weight"
						type="number"
						placeholder="Weight"
						value={eqWeight}
						onChange={(e) => setEqWeight(e.target.value)}
						min="0"
						step="0.1"
						required
					/>
				</div>
				<Button type="submit" variant="success">
					<Plus className="h-4 w-4" />
					Add
				</Button>
			</form>
		</section>
	);
}
