import { useEffect, useState } from "react";
import { useNavigate } from "../../../app/router.tsx";
import { getAbilityModifier } from "../types/character.js";
import type { Character } from "../types/index.js";
import { SKILLS, calculateSkillBonus } from "../types/skills.js";
import styles from "./CharacterSheet.module.css";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

function formatMod(score: number): string {
	const mod = getAbilityModifier(score);
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function CharacterSheet({ id }: { id: string }) {
	const navigate = useNavigate();
	const [character, setCharacter] = useState<Character | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch(`/api/characters/${id}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => setCharacter(data))
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

	if (loading) return <div className={styles.container}>Loading...</div>;
	if (!character) return <div className={styles.container}>Character not found.</div>;

	const hpPercent = character.hp.max > 0 ? (character.hp.current / character.hp.max) * 100 : 0;
	const hpColor = hpPercent > 50 ? "#22c55e" : hpPercent > 25 ? "#eab308" : "#ef4444";

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
						className={styles.hpBarFill}
						style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
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
		</div>
	);
}
