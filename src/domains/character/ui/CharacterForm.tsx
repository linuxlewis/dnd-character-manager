import { useEffect, useState } from "react";
import { useNavigate } from "../../../app/router.tsx";
import { CreateCharacterSchema } from "../types/index.js";
import type { Character } from "../types/index.js";
import styles from "./CharacterForm.module.css";

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;

interface CharacterFormProps {
	id?: string;
}

export function CharacterForm({ id }: CharacterFormProps) {
	const navigate = useNavigate();
	const isEdit = id !== undefined && id !== "new";

	const [name, setName] = useState("");
	const [race, setRace] = useState("");
	const [charClass, setCharClass] = useState("");
	const [level, setLevel] = useState(1);
	const [abilities, setAbilities] = useState({
		STR: 10,
		DEX: 10,
		CON: 10,
		INT: 10,
		WIS: 10,
		CHA: 10,
	});
	const [errors, setErrors] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);
	const [loading, setLoading] = useState(isEdit);

	useEffect(() => {
		if (!isEdit) return;
		fetch(`/api/characters/${id}`)
			.then((r) => r.json())
			.then((c: Character) => {
				setName(c.name);
				setRace(c.race);
				setCharClass(c.class);
				setLevel(c.level);
				setAbilities(c.abilityScores);
			})
			.catch(() => setErrors(["Failed to load character"]))
			.finally(() => setLoading(false));
	}, [id, isEdit]);

	function setAbility(key: string, value: number) {
		setAbilities((prev) => ({ ...prev, [key]: value }));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setErrors([]);

		const data = {
			name,
			race,
			class: charClass,
			level,
			abilityScores: abilities,
			hp: { current: 10, max: 10, temp: 0 },
		};

		const result = CreateCharacterSchema.safeParse(data);
		if (!result.success) {
			setErrors(result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
			return;
		}

		setSubmitting(true);
		try {
			const url = isEdit ? `/api/characters/${id}` : "/api/characters";
			const method = isEdit ? "PUT" : "POST";
			const res = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) {
				setErrors(["Failed to save character"]);
				return;
			}
			navigate("/");
		} catch {
			setErrors(["Network error"]);
		} finally {
			setSubmitting(false);
		}
	}

	if (loading) return <p>Loading...</p>;

	return (
		<div className={styles.container}>
			<button type="button" className={styles.backButton} onClick={() => navigate("/")}>
				← Back
			</button>
			<h1 className={styles.title}>{isEdit ? "Edit Character" : "New Character"}</h1>
			<form className={styles.form} onSubmit={handleSubmit}>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="name">
						Name
					</label>
					<input
						className={styles.input}
						id="name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="race">
						Race
					</label>
					<input
						className={styles.input}
						id="race"
						value={race}
						onChange={(e) => setRace(e.target.value)}
						required
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="charClass">
						Class
					</label>
					<input
						className={styles.input}
						id="charClass"
						value={charClass}
						onChange={(e) => setCharClass(e.target.value)}
						required
					/>
				</div>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="level">
						Level
					</label>
					<input
						className={styles.input}
						id="level"
						type="number"
						min={1}
						max={20}
						value={level}
						onChange={(e) => setLevel(Number(e.target.value))}
						required
					/>
				</div>
				<fieldset style={{ border: "none", padding: 0, margin: 0 }}>
					<legend className={styles.label} style={{ marginBottom: 8 }}>
						Ability Scores
					</legend>
					<div className={styles.abilityGrid}>
						{ABILITY_KEYS.map((key) => (
							<div className={styles.field} key={key}>
								<label className={styles.label} htmlFor={`ability-${key}`}>
									{key}
								</label>
								<input
									className={styles.input}
									id={`ability-${key}`}
									type="number"
									min={1}
									max={30}
									value={abilities[key]}
									onChange={(e) => setAbility(key, Number(e.target.value))}
									required
								/>
							</div>
						))}
					</div>
				</fieldset>
				{errors.length > 0 && (
					<ul className={styles.errorList}>
						{errors.map((err) => (
							<li key={err}>{err}</li>
						))}
					</ul>
				)}
				<button type="submit" className={styles.submitButton} disabled={submitting}>
					{submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Character"}
				</button>
			</form>
		</div>
	);
}
