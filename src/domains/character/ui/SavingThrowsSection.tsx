import { getAbilityModifier } from "../types/character.js";
import type { Character } from "../types/index.js";
import { calculateSavingThrow } from "../types/skills.js";
import styles from "./CharacterSheet.module.css";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

export function SavingThrowsSection({
	character,
	characterId,
	onUpdate,
}: {
	character: Character;
	characterId: string;
	onUpdate: (c: Character) => void;
}) {
	const handleToggleSavingThrow = (abilityKey: string) => {
		fetch(`/api/characters/${characterId}/saving-throws/${abilityKey}/toggle`, {
			method: "POST",
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) onUpdate(data);
			})
			.catch(() => {});
	};

	return (
		<div className={styles.section}>
			<h2 className={styles.sectionTitle}>Saving Throws</h2>
			<div className={styles.skillsList}>
				{ABILITY_KEYS.map((key) => {
					const proficient = character.savingThrowProficiencies?.includes(key) ?? false;
					const bonus = calculateSavingThrow(
						character.abilityScores[key],
						proficient,
						character.level,
					);
					const formatted = bonus >= 0 ? `+${bonus}` : `${bonus}`;
					return (
						<label key={key} className={styles.skillRow} data-testid={`saving-throw-${key}`}>
							<input
								type="checkbox"
								checked={proficient}
								onChange={() => handleToggleSavingThrow(key)}
								className={styles.skillCheckbox}
							/>
							<span className={styles.skillName}>{key}</span>
							<span className={styles.skillBonus}>{formatted}</span>
						</label>
					);
				})}
			</div>
		</div>
	);
}
