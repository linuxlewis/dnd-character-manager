import { useEffect, useState } from "react";
import { useNavigate } from "../../../app/router.tsx";
import { calculateAC, getAbilityModifier } from "../types/character.js";
import type { Character } from "../types/index.js";
import { SKILLS, calculateSkillBonus } from "../types/skills.js";
import styles from "./CharacterSheet.module.css";
import { EquipmentSection } from "./EquipmentSection.tsx";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

function formatMod(score: number): string {
	const mod = getAbilityModifier(score);
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function CharacterSheet({ id }: { id: string }) {
	const navigate = useNavigate();
	const [character, setCharacter] = useState<Character | null>(null);
	const [loading, setLoading] = useState(true);
	const [notes, setNotes] = useState("");
	const [acOverrideInput, setAcOverrideInput] = useState("");
	const [showAcOverride, setShowAcOverride] = useState(false);

	useEffect(() => {
		fetch(`/api/characters/${id}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				setCharacter(data);
				if (data) setNotes(data.notes ?? "");
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [id]);

	const handleDamage = () => {
		const input = prompt("How much damage?");
		if (input === null) return;
		const amount = Number.parseInt(input, 10);
		if (Number.isNaN(amount) || amount <= 0) return;
		fetch(`/api/characters/${id}/damage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ amount }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleHeal = () => {
		const input = prompt("How much healing?");
		if (input === null) return;
		const amount = Number.parseInt(input, 10);
		if (Number.isNaN(amount) || amount <= 0) return;
		fetch(`/api/characters/${id}/heal`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ amount }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleUseSpellSlot = (level: number) => {
		fetch(`/api/characters/${id}/spells/${level}/use`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleRestoreSpellSlot = (level: number) => {
		fetch(`/api/characters/${id}/spells/${level}/restore`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleLongRest = () => {
		fetch(`/api/characters/${id}/long-rest`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleToggleSkill = (skillName: string) => {
		fetch(`/api/characters/${id}/skills/toggle`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ skillName }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleNotesBlur = () => {
		if (!character) return;
		fetch(`/api/characters/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ notes }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleSetAcOverride = () => {
		const value = Number.parseInt(acOverrideInput, 10);
		if (Number.isNaN(value) || value < 0) return;
		fetch(`/api/characters/${id}/ac`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ override: value }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) {
					setCharacter(data);
					setShowAcOverride(false);
					setAcOverrideInput("");
				}
			})
			.catch(() => {});
	};

	const handleClearAcOverride = () => {
		fetch(`/api/characters/${id}/ac`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ override: null }),
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleDelete = () => {
		if (!window.confirm(`Delete ${character?.name ?? "this character"}? This cannot be undone.`))
			return;
		fetch(`/api/characters/${id}`, { method: "DELETE" })
			.then((r) => {
				if (r.ok) navigate("/");
			})
			.catch(() => {});
	};

	if (loading) return <div className={styles.container}>Loading...</div>;
	if (!character) return <div className={styles.container}>Character not found.</div>;

	const acValue = calculateAC(character.abilityScores.DEX, character.armorClass);
	const hasAcOverride = character.armorClass.override !== null;

	const hpPercent = character.hp.max > 0 ? (character.hp.current / character.hp.max) * 100 : 0;
	const hpFillClass =
		hpPercent > 50
			? styles.hpBarFillGood
			: hpPercent > 25
				? styles.hpBarFillWarning
				: styles.hpBarFillDanger;

	return (
		<div className={styles.container}>
			<button type="button" className={styles.backButton} onClick={() => navigate("/")}>
				← Back
			</button>
			<h1 className={styles.name}>{character.name}</h1>
			<p className={styles.meta}>
				{character.race} {character.class} · Level {character.level}
			</p>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Ability Scores</h2>
				<div className={styles.statGrid}>
					{ABILITY_KEYS.map((key) => (
						<div key={key} className={styles.stat}>
							<div className={styles.statLabel}>{key}</div>
							<div className={styles.statValue}>{character.abilityScores[key]}</div>
							<div className={styles.statMod}>{formatMod(character.abilityScores[key])}</div>
						</div>
					))}
				</div>
			</div>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Hit Points</h2>
				<div className={styles.hpDisplay}>
					<span className={styles.hpText}>
						{character.hp.current} / {character.hp.max}
						{character.hp.temp > 0 ? ` (+${character.hp.temp} temp)` : ""}
					</span>
				</div>
				<div className={styles.hpBarTrack}>
					<div
						className={`${styles.hpBarFill} ${hpFillClass}`}
						style={{ width: `${hpPercent}%` }}
					/>
				</div>
				<div className={styles.hpActions}>
					<button type="button" className={styles.damageButton} onClick={handleDamage}>
						Damage
					</button>
					<button type="button" className={styles.healButton} onClick={handleHeal}>
						Heal
					</button>
				</div>
			</div>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Armor Class</h2>
				<div className={styles.acDisplay}>
					<div className={styles.acShield}>
						<span className={styles.acValue} data-testid="ac-value">{acValue}</span>
						<span className={styles.acLabel}>AC</span>
					</div>
					{hasAcOverride && (
						<span className={styles.acOverrideIndicator}>Override</span>
					)}
				</div>
				<div className={styles.acActions}>
					{hasAcOverride ? (
						<button type="button" className={styles.acClearButton} onClick={handleClearAcOverride}>
							Clear Override
						</button>
					) : !showAcOverride ? (
						<button type="button" className={styles.acOverrideButton} onClick={() => setShowAcOverride(true)}>
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
							<button type="button" className={styles.acCancelButton} onClick={() => { setShowAcOverride(false); setAcOverrideInput(""); }}>
								Cancel
							</button>
						</div>
					)}
				</div>
			</div>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Skills</h2>
				<div className={styles.skillsList}>
					{SKILLS.map((skill) => {
						const charSkill = character.skills?.find((s) => s.name === skill.name);
						const proficient = charSkill?.proficient ?? false;
						const bonus = calculateSkillBonus(
							character.abilityScores[skill.abilityKey],
							proficient,
							character.level,
						);
						const formatted = bonus >= 0 ? `+${bonus}` : `${bonus}`;
						return (
							<label key={skill.name} className={styles.skillRow}>
								<input
									type="checkbox"
									checked={proficient}
									onChange={() => handleToggleSkill(skill.name)}
									className={styles.skillCheckbox}
								/>
								<span className={styles.skillName}>{skill.name}</span>
								<span className={styles.skillAbility}>{skill.abilityKey}</span>
								<span className={styles.skillBonus}>{formatted}</span>
							</label>
						);
					})}
				</div>
			</div>

			{character.spellSlots && character.spellSlots.length > 0 && (
				<div className={styles.section}>
					<h2 className={styles.sectionTitle}>Spell Slots</h2>
					{character.spellSlots.map((slot) => (
						<div key={slot.level} className={styles.spellSlotRow}>
							<span className={styles.spellSlotLevel}>Level {slot.level}</span>
							<div className={styles.spellSlotCircles}>
								{Array.from({ length: slot.available }, (_, i) => {
									const isUsed = i < slot.used;
									return (
										<button
											key={`slot-${slot.level}-${i}`}
											type="button"
											className={`${styles.spellSlotCircle} ${isUsed ? styles.spellSlotUsed : styles.spellSlotAvailable}`}
											onClick={() =>
												isUsed ? handleRestoreSpellSlot(slot.level) : handleUseSpellSlot(slot.level)
											}
											aria-label={`Level ${slot.level} slot ${i + 1} - ${isUsed ? "used" : "available"}`}
										/>
									);
								})}
							</div>
							<span className={styles.spellSlotCount}>
								{slot.available - slot.used}/{slot.available}
							</span>
						</div>
					))}
					<button type="button" className={styles.longRestButton} onClick={handleLongRest}>
						Long Rest
					</button>
				</div>
			)}

			<EquipmentSection
				characterId={id}
				equipment={character.equipment ?? []}
				onUpdate={setCharacter}
			/>

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Notes</h2>
				<textarea
					className={styles.notesTextarea}
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					onBlur={handleNotesBlur}
					placeholder="Add notes about your character..."
					rows={6}
				/>
			</div>

			<div className={styles.section}>
				<button type="button" className={styles.deleteButton} onClick={handleDelete}>
					Delete Character
				</button>
			</div>
		</div>
	);
}
