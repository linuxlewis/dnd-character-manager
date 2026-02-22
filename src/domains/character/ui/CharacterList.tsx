import { useEffect, useState } from "react";
import { useNavigate } from "../../../app/router.tsx";
import type { Character } from "../types/index.js";
import styles from "./CharacterList.module.css";

export function CharacterList() {
	const navigate = useNavigate();
	const [characters, setCharacters] = useState<Character[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/characters")
			.then((r) => r.json())
			.then((data) => setCharacters(data))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1 className={styles.title}>Characters</h1>
				<button
					type="button"
					className={styles.newButton}
					onClick={() => navigate("/character/new")}
				>
					+ New Character
				</button>
			</div>
			{loading ? (
				<p>Loading...</p>
			) : characters.length === 0 ? (
				<p className={styles.empty}>No characters yet. Create your first adventurer!</p>
			) : (
				<div className={styles.grid}>
					{characters.map((c) => (
						<button
							key={c.id}
							type="button"
							className={styles.card}
							onClick={() => navigate(`/character/${c.id}`)}
						>
							<div className={styles.cardName}>{c.name}</div>
							<div className={styles.cardMeta}>
								{c.race} · {c.class} · Level {c.level}
							</div>
							<div className={styles.cardHp}>
								HP: {c.hp.current} / {c.hp.max}
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
