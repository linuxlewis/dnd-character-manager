import { useState } from "react";
import { calculateAC } from "../types/character.js";
import type { Character } from "../types/index.js";
import styles from "./CharacterSheet.module.css";

export function ArmorClassSection({
	character,
	characterId,
	onUpdate,
}: {
	character: Character;
	characterId: string;
	onUpdate: (c: Character) => void;
}) {
	const [acOverrideInput, setAcOverrideInput] = useState("");
	const [showAcOverride, setShowAcOverride] = useState(false);

	const acValue = calculateAC(character.abilityScores.DEX, character.armorClass);
	const hasAcOverride = character.armorClass.override !== null;

	const handleSetAcOverride = () => {
		const value = Number.parseInt(acOverrideInput, 10);
		if (Number.isNaN(value) || value < 0) return;
		fetch(`/api/characters/${characterId}/ac`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ override: value }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					onUpdate(data);
					setShowAcOverride(false);
					setAcOverrideInput("");
				}
			})
			.catch(() => {});
	};

	const handleClearAcOverride = () => {
		fetch(`/api/characters/${characterId}/ac`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ override: null }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	return (
		<div className={styles.section}>
			<h2 className={styles.sectionTitle}>Armor Class</h2>
			<div className={styles.acDisplay}>
				<div className={styles.acShield}>
					<span className={styles.acValue} data-testid="ac-value">
						{acValue}
					</span>
					<span className={styles.acLabel}>AC</span>
				</div>
				{hasAcOverride && <span className={styles.acOverrideIndicator}>Override</span>}
			</div>
			<div className={styles.acActions}>
				{hasAcOverride ? (
					<button type="button" className={styles.acClearButton} onClick={handleClearAcOverride}>
						Clear Override
					</button>
				) : !showAcOverride ? (
					<button
						type="button"
						className={styles.acOverrideButton}
						onClick={() => setShowAcOverride(true)}
					>
						Override AC
					</button>
				) : (
					<div className={styles.acOverrideForm}>
						<input
							type="number"
							className={styles.acOverrideInput}
							value={acOverrideInput}
							onChange={(e) => setAcOverrideInput(e.target.value)}
							placeholder="AC value"
							min="0"
						/>
						<button type="button" className={styles.acSetButton} onClick={handleSetAcOverride}>
							Set
						</button>
						<button
							type="button"
							className={styles.acCancelButton}
							onClick={() => {
								setShowAcOverride(false);
								setAcOverrideInput("");
							}}
						>
							Cancel
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
