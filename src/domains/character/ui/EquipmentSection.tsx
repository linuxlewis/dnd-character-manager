import { type FormEvent, useState } from "react";
import { calculateTotalWeight } from "../types/character.js";
import type { Character, EquipmentItem } from "../types/index.js";
import styles from "./EquipmentSection.module.css";

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
		<div className={styles.section}>
			<h2 className={styles.sectionTitle}>Equipment</h2>
			<div className={styles.totalWeight}>Total Weight: {calculateTotalWeight(equipment)} lbs</div>
			{equipment.length > 0 ? (
				<div className={styles.equipmentList}>
					{equipment.map((item) => (
						<div key={item.id} className={styles.equipmentRow}>
							<span className={styles.equipmentName}>{item.name}</span>
							<span className={styles.equipmentQty}>×{item.quantity}</span>
							<span className={styles.equipmentWeight}>{item.weight * item.quantity} lbs</span>
							<button
								type="button"
								className={styles.equipmentRemove}
								onClick={() => handleRemoveEquipment(item.id)}
								aria-label={`Remove ${item.name}`}
							>
								✕
							</button>
						</div>
					))}
				</div>
			) : (
				<p className={styles.emptyText}>No equipment yet.</p>
			)}
			<form className={styles.equipmentForm} onSubmit={handleAddEquipment}>
				<input
					type="text"
					placeholder="Item name"
					value={eqName}
					onChange={(e) => setEqName(e.target.value)}
					className={styles.equipmentInput}
					required
				/>
				<input
					type="number"
					placeholder="Qty"
					value={eqQty}
					onChange={(e) => setEqQty(e.target.value)}
					className={styles.equipmentInputSmall}
					min="1"
					required
				/>
				<input
					type="number"
					placeholder="Weight"
					value={eqWeight}
					onChange={(e) => setEqWeight(e.target.value)}
					className={styles.equipmentInputSmall}
					min="0"
					step="0.1"
					required
				/>
				<button type="submit" className={styles.equipmentAddButton}>
					Add
				</button>
			</form>
		</div>
	);
}
