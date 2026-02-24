import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "../../../app/router.tsx";
import { getAbilityModifier } from "../types/character.js";
import type { Character } from "../types/index.js";
import { SKILLS, calculateSkillBonus } from "../types/skills.js";
import styles from "./CharacterSheet.module.css";
import { EquipmentSection } from "./EquipmentSection.tsx";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

function formatMod(score: number): string {
	const mod = getAbilityModifier(score);
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function CharacterSheet({ id, slug }: { id?: string; slug?: string }) {
	const navigate = useNavigate();
	const [character, setCharacter] = useState<Character | null>(null);
	const [loading, setLoading] = useState(true);
	const [notes, setNotes] = useState("");
	const readOnly = !!slug;
	const characterId = id ?? character?.id;

	useEffect(() => {
		const url = slug ? `/api/characters/by-slug/${slug}` : `/api/characters/${id}`;
		fetch(url)
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				setCharacter(data);
				if (data) setNotes(data.notes ?? "");
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [id, slug]);

	const handleDamage = () => {
		const input = prompt("How much damage?");
		if (input === null) return;
		const amount = Number.parseInt(input, 10);
		if (Number.isNaN(amount) || amount <= 0) return;
		fetch(`/api/characters/${characterId}/damage`, {
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
		fetch(`/api/characters/${characterId}/heal`, {
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
		fetch(`/api/characters/${characterId}/spells/${level}/use`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleRestoreSpellSlot = (level: number) => {
		fetch(`/api/characters/${characterId}/spells/${level}/restore`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleLongRest = () => {
		fetch(`/api/characters/${characterId}/long-rest`, { method: "POST" })
			.then((r) => (r.ok ? r.json() : null))
			.then((data) => {
				if (data) setCharacter(data);
			})
			.catch(() => {});
	};

	const handleToggleSkill = (skillName: string) => {
		fetch(`/api/characters/${characterId}/skills/toggle`, {
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
		fetch(`/api/characters/${characterId}`, {
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

	const handleDelete = () => {
		if (!window.confirm(`Delete ${character?.name ?? "this character"}? This cannot be undone.`))
			return;
		fetch(`/api/characters/${characterId}`, { method: "DELETE" })
			.then((r) => {
				if (r.ok) navigate("/");
			})
			.catch(() => {});
	};

	const [copied, setCopied] = useState(false);
	const shareUrl = character?.slug
		? `${window.location.origin}/characters/${character.slug}`
		: null;

	const handleCopyShareUrl = useCallback(() => {
		if (!shareUrl) return;
		navigator.clipboard
			.writeText(shareUrl)
			.then(() => {
				setCopied(true);
				setTimeout(() => setCopied(false), 2000);
			})
			.catch(() => {});
	}, [shareUrl]);

	if (loading) return <div className={styles.container}>Loading...</div>;
	if (!character) return <div className={styles.container}>Character not found.</div>;

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

			{shareUrl && !readOnly && (
				<div className={styles.shareSection} data-testid="share-url-section">
					<span className={styles.shareLabel}>Share:</span>
					<code className={styles.shareUrl} data-testid="share-url">
						{shareUrl}
					</code>
					<button
						type="button"
						className={styles.copyButton}
						onClick={handleCopyShareUrl}
						data-testid="copy-share-url"
					>
						{copied ? "Copied!" : "Copy"}
					</button>
				</div>
			)}

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
				{!readOnly && (
					<div className={styles.hpActions}>
						<button type="button" className={styles.damageButton} onClick={handleDamage}>
							Damage
						</button>
						<button type="button" className={styles.healButton} onClick={handleHeal}>
							Heal
						</button>
					</div>
				)}
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
									disabled={readOnly}
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

			{characterId && (
				<EquipmentSection
					characterId={characterId}
					equipment={character.equipment ?? []}
					onUpdate={readOnly ? () => {} : setCharacter}
				/>
			)}

			<div className={styles.section}>
				<h2 className={styles.sectionTitle}>Notes</h2>
				<textarea
					className={styles.notesTextarea}
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					onBlur={readOnly ? undefined : handleNotesBlur}
					placeholder="Add notes about your character..."
					rows={6}
					readOnly={readOnly}
				/>
			</div>

			{!readOnly && (
				<div className={styles.section}>
					<button type="button" className={styles.deleteButton} onClick={handleDelete}>
						Delete Character
					</button>
				</div>
			)}
		</div>
	);
}
