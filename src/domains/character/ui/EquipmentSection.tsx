import { X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "../../../app/components/ui/button.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
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
					setEqName("");
					setEqQty("1");
					setEqWeight("0");
				}
			})
			.catch(() => {});
	};

	const handleRemoveEquipment = (itemId: string) => {
		fetch(`/api/characters/${characterId}/equipment/${itemId}`, { method: "DELETE" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	return (
		<div className="mb-6">
			<h2 className="text-lg font-bold text-foreground mb-2">Equipment</h2>
			<div className="text-base font-semibold mb-2 text-foreground">
				Total Weight: {calculateTotalWeight(equipment)} lbs
			</div>
			{equipment.length > 0 ? (
				<div className="flex flex-col gap-1 mb-3">
					{equipment.map((item) => (
						<div
							key={item.id}
							className="flex items-center gap-2 min-h-[44px] px-2 py-1 bg-muted rounded-md shadow-sm transition-colors"
						>
							<span className="flex-1 font-medium text-foreground">{item.name}</span>
							<span className="text-muted-foreground min-w-[2rem] text-center">
								x{item.quantity}
							</span>
							<span className="text-muted-foreground min-w-[4rem] text-right">
								{item.weight * item.quantity} lbs
							</span>
							<Button
								variant="destructive-ghost"
								size="icon"
								className="h-8 w-8"
								onClick={() => handleRemoveEquipment(item.id)}
								aria-label={`Remove ${item.name}`}
							>
								<X className="h-3.5 w-3.5" />
							</Button>
						</div>
					))}
				</div>
			) : (
				<p className="text-muted-foreground italic mb-3">No equipment yet.</p>
			)}
			<form className="flex gap-2 flex-wrap max-sm:flex-col" onSubmit={handleAddEquipment}>
				<Input
					type="text"
					placeholder="Item name"
					value={eqName}
					onChange={(e) => setEqName(e.target.value)}
					className="flex-1 min-w-[120px]"
					required
				/>
				<Input
					type="number"
					placeholder="Qty"
					value={eqQty}
					onChange={(e) => setEqQty(e.target.value)}
					className="w-[70px] max-sm:w-full"
					min="1"
					required
				/>
				<Input
					type="number"
					placeholder="Weight"
					value={eqWeight}
					onChange={(e) => setEqWeight(e.target.value)}
					className="w-[70px] max-sm:w-full"
					min="0"
					step="0.1"
					required
				/>
				<Button type="submit" variant="success">
					Add
				</Button>
			</form>
		</div>
	);
}
