import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../app/components/ui/button.tsx";
import { Input } from "../../../app/components/ui/input.tsx";
import { Label } from "../../../app/components/ui/label.tsx";
import { Select } from "../../../app/components/ui/select.tsx";
import { ITEM_CATEGORY_LABELS } from "../types/equipment.js";
import type { Character, ItemCategory } from "../types/index.js";

interface AddEquipmentFormProps {
	characterId: string;
	onUpdate: (character: Character) => void;
}

export function AddEquipmentForm({ characterId, onUpdate }: AddEquipmentFormProps) {
	const [eqName, setEqName] = useState("");
	const [eqQty, setEqQty] = useState("1");
	const [eqWeight, setEqWeight] = useState("0");
	const [eqCategory, setEqCategory] = useState<ItemCategory>("gear");
	const [eqDescription, setEqDescription] = useState("");

	const handleAddEquipment = (e: FormEvent) => {
		e.preventDefault();
		const quantity = Number.parseInt(eqQty, 10);
		const weight = Number.parseFloat(eqWeight);
		if (!eqName.trim() || Number.isNaN(quantity) || Number.isNaN(weight)) return;
		fetch(`/api/characters/${encodeURIComponent(characterId)}/equipment`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: eqName.trim(),
				quantity,
				weight,
				equipped: false,
				category: eqCategory,
				description: eqDescription.trim(),
			}),
		})
			.then((r) => {
				if (!r.ok) throw new Error("Server error");
				return r.json();
			})
			.then((data) => {
				onUpdate(data);
				toast.success(`Added ${eqName.trim()}`);
				setEqName("");
				setEqQty("1");
				setEqWeight("0");
				setEqCategory("gear");
				setEqDescription("");
			})
			.catch(() => {
				toast.error("Failed to add equipment");
			});
	};

	return (
		<form className="space-y-2" onSubmit={handleAddEquipment} aria-label="Add equipment">
			<div className="flex gap-2 flex-wrap max-sm:flex-col">
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
				<div className="w-[120px] max-sm:w-full">
					<Label htmlFor="eq-category" className="sr-only">
						Category
					</Label>
					<Select
						id="eq-category"
						value={eqCategory}
						onChange={(e) => setEqCategory(e.target.value as ItemCategory)}
						aria-label="Category"
					>
						{Object.entries(ITEM_CATEGORY_LABELS).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</Select>
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
			</div>
			<div className="flex gap-2 max-sm:flex-col">
				<div className="flex-1">
					<Label htmlFor="eq-description" className="sr-only">
						Description
					</Label>
					<Input
						id="eq-description"
						type="text"
						placeholder="Description (optional)"
						value={eqDescription}
						onChange={(e) => setEqDescription(e.target.value)}
					/>
				</div>
				<Button type="submit" variant="success">
					<Plus className="h-4 w-4" />
					Add
				</Button>
			</div>
		</form>
	);
}
